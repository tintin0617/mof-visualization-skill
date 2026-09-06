const STYLES = {
  Zr: { base: '#2D9FC4', light: '#DDF8FF', dark: '#15536F', radius: 8.2 },
  Zn: { base: '#55B8DD', light: '#E5FAFF', dark: '#1F688E', radius: 7.4 },
  Co: { base: '#5977CC', light: '#DCE5FF', dark: '#253D83', radius: 7.4 },
  Al: { base: '#6ABFC5', light: '#E5FFFF', dark: '#28656A', radius: 7.0 },
  Fe: { base: '#C77947', light: '#FFE5D3', dark: '#753C1D', radius: 7.2 },
  Cr: { base: '#638E72', light: '#E4F4E7', dark: '#2E5A3A', radius: 7.2 },
  Ni: { base: '#4EA777', light: '#E0F7EA', dark: '#226043', radius: 7.0 },
  Ti: { base: '#708EB4', light: '#E5F0FF', dark: '#354F72', radius: 7.0 },
  Cu: { base: '#C47B42', light: '#FFE7CF', dark: '#70401D', radius: 7.2 },
  C: { base: '#8797AB', light: '#F1F5FA', dark: '#435064', radius: 3.3 },
  N: { base: '#536FD0', light: '#DDE5FF', dark: '#263B86', radius: 4.6 },
  O: { base: '#DF685F', light: '#FFE8E3', dark: '#8E302D', radius: 4.4 },
  S: { base: '#D4A63F', light: '#FFF1C5', dark: '#795A15', radius: 5.0 },
};

export function rotatePoint([x, y, z], angle, fixed = {}) {
  const ax = fixed.ax ?? (-0.34 + 0.045 * Math.sin(angle * 2));
  const ay = fixed.ay ?? angle;
  const az = fixed.az ?? 0.09;
  const y1 = y * Math.cos(ax) - z * Math.sin(ax);
  const z1 = y * Math.sin(ax) + z * Math.cos(ax);
  const x2 = x * Math.cos(ay) + z1 * Math.sin(ay);
  const z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
  return [
    x2 * Math.cos(az) - y1 * Math.sin(az),
    x2 * Math.sin(az) + y1 * Math.cos(az),
    z2,
  ];
}

export function projectPoint([x, y, z], cameraDistance) {
  const perspective = cameraDistance / (cameraDistance - z);
  return { x: x * perspective, y: y * perspective, z, perspective };
}

export function sceneRadius(atoms) {
  return Math.max(1, ...atoms.map((atom) => Math.hypot(...atom.p)));
}

export function bondVisualStyle(elementA, elementB, depth) {
  const pair = [elementA, elementB].sort().join('-');
  const coordination = ['O-Zr', 'N-Zn', 'Co-N', 'Al-O', 'Fe-O', 'Cr-O', 'Ni-O', 'O-Ti', 'Cu-O'].includes(pair);
  return coordination
    ? { color: 'rgba(79, 183, 214, ' + (0.42 + 0.52 * depth) + ')', widthMultiplier: 1.32 }
    : { color: 'rgba(132, 158, 188, ' + (0.28 + 0.58 * depth) + ')', widthMultiplier: 1 };
}

export function drawScene(ctx, cluster, angle, box, options = {}) {
  const radius = sceneRadius(cluster.atoms);
  const cameraDistance = radius * 3.4;
  const scale = Math.min(box.w, box.h) / (radius * 2.28);
  const pixelRatio = Math.min(box.w, box.h) / 1600;
  const rotated = cluster.atoms.map((atom) => ({
    ...atom,
    q: rotatePoint(atom.p, angle, options.fixedRotation || {}),
  }));
  const projected = rotated.map((atom) => {
    const point = projectPoint(atom.q, cameraDistance);
    return {
      ...atom,
      ...point,
      x: box.x + box.w / 2 + point.x * scale,
      y: box.y + box.h / 2 - point.y * scale,
    };
  });
  const minDepth = Math.min(...projected.map((atom) => atom.z));
  const maxDepth = Math.max(...projected.map((atom) => atom.z));
  const depth01 = (z) => (z - minDepth) / Math.max(0.001, maxDepth - minDepth);
  const bonds = cluster.bonds
    .map(([i, j]) => ({ i, j, z: (projected[i].z + projected[j].z) / 2 }))
    .sort((a, b) => a.z - b.z);

  ctx.save();
  ctx.lineCap = 'round';
  for (const bond of bonds) {
    const a = projected[bond.i];
    const b = projected[bond.j];
    const depth = depth01(bond.z);
    const visual = bondVisualStyle(a.element, b.element, depth);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = pixelRatio * (1.35 + 1.35 * depth) * visual.widthMultiplier;
    ctx.strokeStyle = visual.color;
    ctx.stroke();
  }
  projected.sort((a, b) => a.z - b.z);
  for (const atom of projected) {
    const style = STYLES[atom.element] || STYLES.C;
    const depth = depth01(atom.z);
    const atomRadius = style.radius * pixelRatio * atom.perspective * (0.86 + depth * 0.22);
    const gradient = ctx.createRadialGradient(
      atom.x - atomRadius * 0.34,
      atom.y - atomRadius * 0.38,
      atomRadius * 0.08,
      atom.x,
      atom.y,
      atomRadius,
    );
    gradient.addColorStop(0, style.light);
    gradient.addColorStop(0.34, style.base);
    gradient.addColorStop(1, style.dark);
    ctx.globalAlpha = 0.64 + depth * 0.36;
    ctx.beginPath();
    ctx.arc(atom.x, atom.y, atomRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
  ctx.restore();
  return { atomCount: projected.length, bondCount: bonds.length, radius };
}
