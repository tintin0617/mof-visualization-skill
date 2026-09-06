import crypto from 'node:crypto';

export function tokens(line) {
  return line.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((value) => value.replace(/^['"]|['"]$/g, '')) ?? [];
}

function numberToken(value) {
  return Number(String(value).replace(/\([^)]*\)$/, ''));
}

export function parseCif(text) {
  const lines = text.split(/\r?\n/);
  const cell = {};
  const cellTags = {
    _cell_length_a: 'a',
    _cell_length_b: 'b',
    _cell_length_c: 'c',
    _cell_angle_alpha: 'alpha',
    _cell_angle_beta: 'beta',
    _cell_angle_gamma: 'gamma',
  };
  for (const raw of lines) {
    const row = tokens(raw.trim());
    if (cellTags[row[0]]) cell[cellTags[row[0]]] = numberToken(row[1]);
  }
  for (const key of ['a', 'b', 'c', 'alpha', 'beta', 'gamma']) {
    if (!Number.isFinite(cell[key])) throw new Error('CIF missing valid cell field: ' + key);
  }

  let headers = [];
  let rows = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== 'loop_') continue;
    const candidate = [];
    let cursor = index + 1;
    while (cursor < lines.length && lines[cursor].trim().startsWith('_')) {
      candidate.push(lines[cursor].trim());
      cursor += 1;
    }
    if (!candidate.includes('_atom_site_fract_x')) continue;
    while (cursor < lines.length) {
      const raw = lines[cursor].trim();
      if (!raw || raw === 'loop_' || raw.startsWith('_') || raw.startsWith('data_')) break;
      const row = tokens(raw);
      if (row.length >= candidate.length) rows.push(row);
      cursor += 1;
    }
    headers = candidate;
    break;
  }

  const columns = Object.fromEntries(headers.map((header, index) => [header, index]));
  for (const field of [
    '_atom_site_label',
    '_atom_site_type_symbol',
    '_atom_site_fract_x',
    '_atom_site_fract_y',
    '_atom_site_fract_z',
  ]) {
    if (!(field in columns)) throw new Error('CIF atom loop missing field: ' + field);
  }
  const atoms = rows.map((row, index) => ({
    index,
    label: row[columns._atom_site_label],
    element: row[columns._atom_site_type_symbol].replace(/[^A-Za-z]/g, ''),
    f: [
      numberToken(row[columns._atom_site_fract_x]),
      numberToken(row[columns._atom_site_fract_y]),
      numberToken(row[columns._atom_site_fract_z]),
    ],
  }));
  if (!atoms.length || atoms.some((atom) => atom.f.some((value) => !Number.isFinite(value)))) {
    throw new Error('CIF has no valid fractional atom coordinates');
  }
  return { cell, atoms };
}

export function cellMatrix(cell) {
  const radians = Math.PI / 180;
  const ca = Math.cos(cell.alpha * radians);
  const cb = Math.cos(cell.beta * radians);
  const cg = Math.cos(cell.gamma * radians);
  const sg = Math.sin(cell.gamma * radians);
  if (Math.abs(sg) < 1e-10) throw new Error('CIF has a degenerate gamma cell angle.');
  const a = [cell.a, 0, 0];
  const b = [cell.b * cg, cell.b * sg, 0];
  const cx = cell.c * cb;
  const cy = cell.c * (ca - cb * cg) / sg;
  const c = [cx, cy, Math.sqrt(Math.max(0, cell.c ** 2 - cx ** 2 - cy ** 2))];
  return [a, b, c];
}

export function fractionalToCartesian(fractional, cell) {
  const matrix = cellMatrix(cell);
  return [0, 1, 2].map((axis) => (
    fractional[0] * matrix[0][axis]
    + fractional[1] * matrix[1][axis]
    + fractional[2] * matrix[2][axis]
  ));
}

export function elementCounts(atoms) {
  const result = {};
  for (const atom of atoms) result[atom.element] = (result[atom.element] || 0) + 1;
  return result;
}

export function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function writePreparedCif(structure) {
  const { cell, atoms } = structure;
  const body = atoms.map((atom, index) => (
    atom.element + (index + 1) + ' ' + atom.element + ' ' + atom.f.map((value) => value.toFixed(8)).join(' ')
  )).join('\n');
  return [
    'data_prepared',
    '_cell_length_a ' + cell.a,
    '_cell_length_b ' + cell.b,
    '_cell_length_c ' + cell.c,
    '_cell_angle_alpha ' + cell.alpha,
    '_cell_angle_beta ' + cell.beta,
    '_cell_angle_gamma ' + cell.gamma,
    "_symmetry_space_group_name_H-M 'P 1'",
    'loop_',
    '_atom_site_label',
    '_atom_site_type_symbol',
    '_atom_site_fract_x',
    '_atom_site_fract_y',
    '_atom_site_fract_z',
    body,
    '',
  ].join('\n');
}

export const BOND_LIMITS = {
  'C-C': [1.15, 1.75],
  'C-N': [1.10, 1.72],
  'C-O': [1.05, 1.65],
  'N-Zn': [1.75, 2.45],
  'Co-N': [1.75, 2.45],
  'O-Zr': [1.75, 2.55],
};

export function pairKey(a, b) {
  return [a, b].sort().join('-');
}

export function minimumImageVector(a, b, cell) {
  const delta = a.map((value, index) => {
    let difference = b[index] - value;
    difference -= Math.round(difference);
    return difference;
  });
  return fractionalToCartesian(delta, cell);
}

export function buildPeriodicBonds(atoms, cell) {
  const bonds = [];
  for (let first = 0; first < atoms.length; first += 1) {
    for (let second = first + 1; second < atoms.length; second += 1) {
      const pair = pairKey(atoms[first].element, atoms[second].element);
      const limit = BOND_LIMITS[pair];
      if (!limit) continue;
      const vector = minimumImageVector(atoms[first].f, atoms[second].f, cell);
      const distance = Math.hypot(...vector);
      if (distance >= limit[0] && distance <= limit[1]) {
        bonds.push({ i: first, j: second, pair, distance, vector });
      }
    }
  }
  return bonds;
}

export function buildVisualCluster(atoms, cell, radius = Math.min(cell.a, cell.b, cell.c) * 0.68) {
  const cluster = [];
  const seen = new Set();
  for (const atom of atoms) {
    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        for (let z = -1; z <= 1; z += 1) {
          const fractional = [atom.f[0] + x - 0.5, atom.f[1] + y - 0.5, atom.f[2] + z - 0.5];
          const p = fractionalToCartesian(fractional, cell);
          if (Math.hypot(...p) > radius) continue;
          const key = atom.element + ':' + p.map((value) => value.toFixed(4)).join(':');
          if (!seen.has(key)) {
            seen.add(key);
            cluster.push({ ...atom, p });
          }
        }
      }
    }
  }
  return connectCluster(cluster);
}

export function buildSymmetricCellCluster(atoms, cell) {
  const cluster = [];
  const seen = new Set();
  const epsilon = 1e-7;
  for (const atom of atoms) {
    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        for (let z = -1; z <= 1; z += 1) {
          const fractional = [atom.f[0] + x - 0.5, atom.f[1] + y - 0.5, atom.f[2] + z - 0.5];
          if (fractional.some((value) => Math.abs(value) > 0.5 + epsilon)) continue;
          const p = fractionalToCartesian(fractional, cell);
          const key = atom.element + ':' + p.map((value) => value.toFixed(4)).join(':');
          if (!seen.has(key)) {
            seen.add(key);
            cluster.push({ ...atom, p });
          }
        }
      }
    }
  }
  return connectCluster(cluster);
}

function connectCluster(atoms) {
  const bonds = [];
  for (let first = 0; first < atoms.length; first += 1) {
    for (let second = first + 1; second < atoms.length; second += 1) {
      const limit = BOND_LIMITS[pairKey(atoms[first].element, atoms[second].element)];
      if (!limit) continue;
      const distance = Math.hypot(...atoms[first].p.map((value, axis) => value - atoms[second].p[axis]));
      if (distance >= limit[0] && distance <= limit[1]) bonds.push([first, second]);
    }
  }
  return { atoms, bonds };
}
