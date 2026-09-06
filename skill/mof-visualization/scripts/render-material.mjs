#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { parseCif, buildVisualCluster, buildSymmetricCellCluster, sha256 } from './cif-core.mjs';
import { drawScene } from './render-core.mjs';
import { parseArgs, loadMaterialConfig, getProjectRoot, materialPaths } from './material-config.mjs';

export function resolveClusterMode(config) {
  const mode = config.render?.clusterMode || 'cell';
  if (!['cell', 'spherical'].includes(mode)) throw new Error('Unsupported cluster mode: ' + mode);
  return mode;
}

function ensureParent(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function navyBackground(ctx, width, height) {
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#071022');
  background.addColorStop(0.62, '#0A1428');
  background.addColorStop(1, '#101A31');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
}

function renderCanvas(width, height, cluster, angle, background = 'transparent', padding = 0.055) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (background === 'navy') navyBackground(ctx, width, height);
  const pad = Math.min(width, height) * padding;
  drawScene(ctx, cluster, angle, {
    x: pad,
    y: pad,
    w: width - 2 * pad,
    h: height - 2 * pad,
  });
  return canvas;
}

async function encodeAnimation({ cluster, output, width, height, fps, duration, ffmpeg }) {
  const frameCount = Math.round(fps * duration);
  ensureParent(output);
  const processHandle = spawn(ffmpeg, [
    '-hide_banner',
    '-loglevel', 'warning',
    '-y',
    '-f', 'rawvideo',
    '-pixel_format', 'rgba',
    '-video_size', width + 'x' + height,
    '-framerate', String(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-an',
    output,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const completion = new Promise((resolve, reject) => {
    processHandle.once('error', reject);
    processHandle.once('exit', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg exited ' + code)));
  });
  try {
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const angle = Math.PI * 2 * frameIndex / frameCount;
      const canvas = renderCanvas(width, height, cluster, angle, 'navy', 0.075);
      const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
      const frame = Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength);
      if (!processHandle.stdin.write(frame)) await once(processHandle.stdin, 'drain');
    }
    processHandle.stdin.end();
    await completion;
  } catch (error) {
    processHandle.stdin.destroy();
    processHandle.kill('SIGTERM');
    throw error;
  }
}

export async function renderMaterial(args) {
  const material = loadMaterialConfig(args.config);
  const root = getProjectRoot(args);
  const paths = materialPaths(root, material);
  const validation = JSON.parse(fs.readFileSync(paths.validation, 'utf8'));
  if (!validation.pass) throw new Error('Structural validation did not pass; rendering is blocked.');

  const structure = parseCif(fs.readFileSync(paths.preparedCif, 'utf8'));
  const mode = resolveClusterMode(material);
  const radius = Number(args['cluster-radius'] || Math.min(structure.cell.a, structure.cell.b, structure.cell.c) * 0.68);
  const cluster = mode === 'spherical'
    ? buildVisualCluster(structure.atoms, structure.cell, radius)
    : buildSymmetricCellCluster(structure.atoms, structure.cell);

  const stillSize = Number(args['still-size'] || 4096);
  const previewSize = Number(args['preview-size'] || 4096);
  const videoWidth = Number(args['video-width'] || 3840);
  const videoHeight = Number(args['video-height'] || 2160);
  const fps = Number(args.fps || 24);
  const duration = Number(args.duration || 18);
  const ffmpeg = args.ffmpeg || process.env.FFMPEG_PATH || 'ffmpeg';

  ensureParent(paths.image);
  ensureParent(paths.preview);
  const still = renderCanvas(stillSize, stillSize, cluster, Math.PI * 0.21, 'transparent', 0.07);
  fs.writeFileSync(paths.image, still.toBuffer('image/png'));

  const preview = createCanvas(previewSize, previewSize);
  const previewContext = preview.getContext('2d');
  navyBackground(previewContext, previewSize, previewSize);
  const gap = previewSize * 0.025;
  const tile = (previewSize - gap * 3) / 2;
  const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  for (let index = 0; index < angles.length; index += 1) {
    const x = gap + (index % 2) * (tile + gap);
    const y = gap + Math.floor(index / 2) * (tile + gap);
    drawScene(previewContext, cluster, angles[index], { x, y, w: tile, h: tile });
  }
  fs.writeFileSync(paths.preview, preview.toBuffer('image/png'));

  if (!args['skip-video']) {
    await encodeAnimation({
      cluster,
      output: paths.animation,
      width: videoWidth,
      height: videoHeight,
      fps,
      duration,
      ffmpeg,
    });
  }

  const outputFiles = [paths.image, paths.preview, ...(!args['skip-video'] ? [paths.animation] : [])];
  const record = {
    materialId: material.id,
    name: material.name,
    visualCluster: {
      mode,
      radiusAngstrom: mode === 'spherical' ? radius : null,
      atoms: cluster.atoms.length,
      bonds: cluster.bonds.length,
    },
    still: { path: path.relative(root, paths.image), width: stillSize, height: stillSize, transparent: true },
    preview: { path: path.relative(root, paths.preview), views: 4 },
    animation: args['skip-video'] ? null : {
      path: path.relative(root, paths.animation),
      width: videoWidth,
      height: videoHeight,
      fps,
      duration,
      codec: 'H.264',
      pixelFormat: 'yuv420p',
    },
    files: Object.fromEntries(outputFiles.map((file) => [path.relative(root, file), sha256(fs.readFileSync(file))])),
  };

  let manifest = { generatedAt: new Date().toISOString(), materials: {} };
  if (fs.existsSync(paths.manifest)) manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
  manifest.generatedAt = new Date().toISOString();
  manifest.materials[material.id] = record;
  ensureParent(paths.manifest);
  fs.writeFileSync(paths.manifest, JSON.stringify(manifest, null, 2) + '\n');
  return record;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const record = await renderMaterial(parseArgs());
  console.log(JSON.stringify(record, null, 2));
}
