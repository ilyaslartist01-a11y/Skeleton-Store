import React from 'react';
import { resolveGarmentSilhouette } from '../data/catalog.ts';
import type {
  CustomGarmentType,
  CustomLayer,
  GarmentSilhouette,
  StudioGarmentOption,
} from '../types.ts';

interface CustomGarmentSvgProps {
  garmentType: CustomGarmentType;
  silhouette?: GarmentSilhouette;
  studioGarments?: StudioGarmentOption[];
  side: 'front' | 'back';
  colorHex: string;
  showPrintGuide?: boolean;
  withHood?: boolean;
  withAnkleCuffs?: boolean;
  className?: string;
}

function adjustHexBrightness(hex: string, delta: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = Math.max(0, Math.min(255, parseInt(clean.slice(0, 2), 16) + delta));
  const g = Math.max(0, Math.min(255, parseInt(clean.slice(2, 4), 16) + delta));
  const b = Math.max(0, Math.min(255, parseInt(clean.slice(4, 6), 16) + delta));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

function isLightColor(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

export function buildGarmentSvgMarkup(
  garmentType: CustomGarmentType,
  side: 'front' | 'back',
  colorHex: string,
  showPrintGuide = false,
  explicitSilhouette?: GarmentSilhouette,
  studioGarments?: StudioGarmentOption[],
  options?: { withHood?: boolean; withAnkleCuffs?: boolean }
): string {
  const withHood = options?.withHood !== false;
  const withAnkleCuffs = options?.withAnkleCuffs !== false;
  const silhouette =
    explicitSilhouette || resolveGarmentSilhouette(garmentType, studioGarments);

  const light = isLightColor(colorHex);
  const baseLight = adjustHexBrightness(colorHex, light ? 8 : 18);
  const baseDark = adjustHexBrightness(colorHex, light ? -24 : -16);
  const seamStroke = light ? 'rgba(20, 22, 26, 0.25)' : 'rgba(255, 255, 255, 0.18)';
  const foldShadow = light ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.34)';
  const outlineStroke = light ? '#9E9789' : '#090A0C';
  const guideStroke = light ? 'rgba(20, 21, 24, 0.36)' : 'rgba(242, 236, 224, 0.36)';
  const cordColor = light ? '#D6CFC2' : '#ECE7DC';

  // =====================================================================
  // 1. T-SHIRTS (classic, oversize, boxy, longsleeve)
  // =====================================================================
  if (silhouette.startsWith('tshirt-')) {
    const neckPath =
      side === 'front'
        ? `<path d="M196 86 C215 130 285 130 304 86 L292 78 C275 112 225 112 208 78 Z" fill="${baseDark}" stroke="${seamStroke}" stroke-width="1.5" />
           <path d="M208 78 C225 112 275 112 292 78 C272 88 228 88 208 78 Z" fill="${foldShadow}" />`
        : `<path d="M196 86 C220 100 280 100 304 86 L294 78 C274 88 226 88 206 78 Z" fill="${baseDark}" stroke="${seamStroke}" stroke-width="1.5" />`;

    if (silhouette === 'tshirt-oversize') {
      const guideRect =
        side === 'front'
          ? `<rect x="155" y="155" width="190" height="250" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`
          : `<rect x="155" y="140" width="190" height="265" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`;

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
          <defs>
            <linearGradient id="teeOvGrad" x1="0" y1="0" x2="1" y2="0.85">
              <stop offset="0%" stop-color="${baseLight}" />
              <stop offset="52%" stop-color="${colorHex}" />
              <stop offset="100%" stop-color="${baseDark}" />
            </linearGradient>
          </defs>
          <path d="M196 84 L106 112 L24 236 L98 286 L124 236 L122 520 C196 534 304 534 378 520 L376 236 L402 286 L476 236 L394 112 L304 84 C282 118 218 118 196 84 Z"
            fill="url(#teeOvGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
          <path d="M124 236 L142 518 L122 520 Z" fill="${foldShadow}" />
          <path d="M376 236 L358 518 L378 520 Z" fill="${foldShadow}" />
          <path d="M162 145 Q150 325 166 492" fill="none" stroke="${foldShadow}" stroke-width="7" stroke-linecap="round" opacity="0.55" />
          <path d="M338 145 Q350 325 334 492" fill="none" stroke="${foldShadow}" stroke-width="7" stroke-linecap="round" opacity="0.55" />
          <!-- Drop Shoulder Seams -->
          <path d="M98 118 L124 236" fill="none" stroke="${seamStroke}" stroke-width="1.6" stroke-dasharray="3 3" />
          <path d="M402 118 L376 236" fill="none" stroke="${seamStroke}" stroke-width="1.6" stroke-dasharray="3 3" />
          <path d="M31 230 L102 278" fill="none" stroke="${seamStroke}" stroke-width="1.5" />
          <path d="M469 230 L398 278" fill="none" stroke="${seamStroke}" stroke-width="1.5" />
          <path d="M124 506 C198 520 302 520 376 506" fill="none" stroke="${seamStroke}" stroke-width="1.4" stroke-dasharray="4 3" />
          ${neckPath}
          ${showPrintGuide ? guideRect : ''}
        </svg>
      `;
    }

    if (silhouette === 'tshirt-boxy') {
      const guideRect =
        side === 'front'
          ? `<rect x="155" y="150" width="190" height="215" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`
          : `<rect x="155" y="138" width="190" height="225" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`;

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
          <defs>
            <linearGradient id="teeBoxGrad" x1="0" y1="0" x2="1" y2="0.85">
              <stop offset="0%" stop-color="${baseLight}" />
              <stop offset="52%" stop-color="${colorHex}" />
              <stop offset="100%" stop-color="${baseDark}" />
            </linearGradient>
          </defs>
          <!-- Wide Cropped Boxy Torso -->
          <path d="M196 84 L112 106 L32 214 L98 264 L120 222 L118 456 L382 456 L380 222 L402 264 L468 214 L388 106 L304 84 C282 118 218 118 196 84 Z"
            fill="url(#teeBoxGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
          <path d="M120 222 L138 454 L118 456 Z" fill="${foldShadow}" />
          <path d="M380 222 L362 454 L382 456 Z" fill="${foldShadow}" />
          <path d="M108 110 L120 222" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
          <path d="M392 110 L380 222" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
          <path d="M38 208 L102 256" fill="none" stroke="${seamStroke}" stroke-width="1.5" />
          <path d="M462 208 L398 256" fill="none" stroke="${seamStroke}" stroke-width="1.5" />
          <!-- Double Boxy Straight Hem Stitch -->
          <path d="M120 442 L380 442" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="4 3" />
          <path d="M120 448 L380 448" fill="none" stroke="${seamStroke}" stroke-width="1" stroke-dasharray="4 3" />
          ${neckPath}
          ${showPrintGuide ? guideRect : ''}
        </svg>
      `;
    }

    if (silhouette === 'tshirt-longsleeve') {
      const guideRect =
        side === 'front'
          ? `<rect x="165" y="155" width="170" height="235" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`
          : `<rect x="165" y="140" width="170" height="250" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`;

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
          <defs>
            <linearGradient id="teeLsGrad" x1="0" y1="0" x2="1" y2="0.85">
              <stop offset="0%" stop-color="${baseLight}" />
              <stop offset="52%" stop-color="${colorHex}" />
              <stop offset="100%" stop-color="${baseDark}" />
            </linearGradient>
          </defs>
          <path d="M196 84 L126 108 L44 316 L66 446 L112 442 L120 326 L142 210 L140 504 C205 516 295 516 360 504 L358 210 L380 326 L388 442 L434 446 L456 316 L374 108 L304 84 C282 118 218 118 196 84 Z"
            fill="url(#teeLsGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
          <!-- Ribbed Cuffs -->
          <path d="M64 426 L113 424 L112 446 L66 448 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="1.8" />
          <path d="M387 424 L436 426 L434 448 L388 446 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="1.8" />
          <path d="M142 210 L156 502 L140 504 Z" fill="${foldShadow}" />
          <path d="M358 210 L344 502 L360 504 Z" fill="${foldShadow}" />
          <path d="M128 110 L142 210" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
          <path d="M372 110 L358 210" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
          <path d="M141 492 C206 504 294 504 359 492" fill="none" stroke="${seamStroke}" stroke-width="1.4" stroke-dasharray="4 3" />
          ${neckPath}
          ${showPrintGuide ? guideRect : ''}
        </svg>
      `;
    }

    // Default: tshirt-classic
    const guideRect =
      side === 'front'
        ? `<rect x="165" y="155" width="170" height="235" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`
        : `<rect x="165" y="140" width="170" height="250" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
        <defs>
          <linearGradient id="teeBodyGrad" x1="0" y1="0" x2="1" y2="0.85">
            <stop offset="0%" stop-color="${baseLight}" />
            <stop offset="52%" stop-color="${colorHex}" />
            <stop offset="100%" stop-color="${baseDark}" />
          </linearGradient>
        </defs>
        <path d="M196 84 L126 108 L44 196 L104 248 L142 208 L140 504 C205 516 295 516 360 504 L358 208 L396 248 L456 196 L374 108 L304 84 C282 118 218 118 196 84 Z"
          fill="url(#teeBodyGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M142 208 L156 502 L140 504 Z" fill="${foldShadow}" />
        <path d="M358 208 L344 502 L360 504 Z" fill="${foldShadow}" />
        <path d="M172 140 Q162 310 176 475" fill="none" stroke="${foldShadow}" stroke-width="6" stroke-linecap="round" opacity="0.55" />
        <path d="M328 140 Q338 310 324 475" fill="none" stroke="${foldShadow}" stroke-width="6" stroke-linecap="round" opacity="0.55" />
        <path d="M126 108 L142 208" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
        <path d="M374 108 L358 208" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
        <path d="M49 190 L108 242" fill="none" stroke="${seamStroke}" stroke-width="1.5" />
        <path d="M451 190 L392 242" fill="none" stroke="${seamStroke}" stroke-width="1.5" />
        <path d="M141 492 C206 504 294 504 359 492" fill="none" stroke="${seamStroke}" stroke-width="1.4" stroke-dasharray="4 3" />
        ${neckPath}
        ${showPrintGuide ? guideRect : ''}
      </svg>
    `;
  }

  // =====================================================================
  // 2. HOODIES (classic, oversize, zip, boxy)
  // =====================================================================
  if (silhouette.startsWith('hoodie-')) {
    const standardHood =
      side === 'front'
        ? `
          <!-- Large Plush Hood Leaning Back Around Collar -->
          <path d="M164 116 C152 68 182 34 250 34 C318 34 348 68 336 116 C322 140 292 148 250 148 C208 148 178 140 164 116 Z"
            fill="url(#hoodieBodyGrad)" stroke="${outlineStroke}" stroke-width="2.4" stroke-linejoin="round" />
          <path d="M184 112 C178 72 202 50 250 50 C298 50 322 72 316 112 C294 138 206 138 184 112 Z"
            fill="${baseDark}" stroke="${seamStroke}" stroke-width="1.6" />
          <path d="M196 112 C194 78 214 62 250 62 C286 62 306 78 304 112 C284 132 216 132 196 112 Z"
            fill="${foldShadow}" />
          <!-- Side Drape Folds & Crossed Collar Lip -->
          <path d="M172 86 Q184 104 186 124" fill="none" stroke="${foldShadow}" stroke-width="4.5" stroke-linecap="round" opacity="0.6" />
          <path d="M328 86 Q316 104 314 124" fill="none" stroke="${foldShadow}" stroke-width="4.5" stroke-linecap="round" opacity="0.6" />
          <path d="M188 106 Q228 140 264 136" fill="none" stroke="${outlineStroke}" stroke-width="1.6" opacity="0.7" />
          <path d="M312 106 Q272 140 236 136" fill="none" stroke="${outlineStroke}" stroke-width="1.6" opacity="0.7" />
          <!-- Drawstrings with Gold Tips -->
          <path d="M230 128 C226 160 227 190 229 220" fill="none" stroke="${cordColor}" stroke-width="3.2" stroke-linecap="round" />
          <path d="M270 128 C274 160 273 190 271 220" fill="none" stroke="${cordColor}" stroke-width="3.2" stroke-linecap="round" />
          <rect x="226.5" y="217" width="5" height="12" rx="1.5" fill="#C6A87D" stroke="#090A0C" stroke-width="0.8" />
          <rect x="268.5" y="217" width="5" height="12" rx="1.5" fill="#C6A87D" stroke="#090A0C" stroke-width="0.8" />
        `
        : `
          <!-- Soft Shadow Below Draped Hood on Upper Back -->
          <path d="M162 198 C202 236 298 236 338 198 C322 226 288 242 250 242 C212 242 178 226 162 198 Z"
            fill="${foldShadow}" opacity="0.85" />
          <!-- Large Hood Draped & Leaning Backwards Over Upper Back -->
          <path d="M184 104 C168 76 190 62 250 62 C310 62 332 76 316 104 C340 134 348 174 336 200 C302 230 198 230 164 200 C152 174 160 134 184 104 Z"
            fill="url(#hoodieBodyGrad)" stroke="${outlineStroke}" stroke-width="2.4" stroke-linejoin="round" />
          <!-- Top Roll-Over Fold Where Hood Leans Back -->
          <path d="M186 102 C208 78 292 78 314 102" fill="none" stroke="${seamStroke}" stroke-width="1.6" />
          <path d="M194 90 C218 74 282 74 306 90" fill="none" stroke="${foldShadow}" stroke-width="5.5" stroke-linecap="round" opacity="0.55" />
          <!-- Center Seam & Natural Drape Creases -->
          <path d="M250 62 L250 222" fill="none" stroke="${seamStroke}" stroke-width="1.6" stroke-dasharray="4 3" />
          <path d="M180 146 Q196 190 222 208" fill="none" stroke="${foldShadow}" stroke-width="5.5" stroke-linecap="round" opacity="0.5" />
          <path d="M320 146 Q304 190 278 208" fill="none" stroke="${foldShadow}" stroke-width="5.5" stroke-linecap="round" opacity="0.5" />
          <path d="M172 194 C208 218 292 218 328 194" fill="none" stroke="${seamStroke}" stroke-width="1.5" opacity="0.8" />
        `;

    const necklessCollar = (leftX: number, rightX: number) =>
      side === 'front'
        ? `
          <path d="M${leftX} 104 C${leftX + 24} 138 ${rightX - 24} 138 ${rightX} 104 L${rightX - 10} 97 C${rightX - 28} 124 ${leftX + 28} 124 ${leftX + 10} 97 Z"
            fill="${baseDark}" stroke="${outlineStroke}" stroke-width="1.8" />
          <path d="M${leftX + 10} 97 C${leftX + 28} 124 ${rightX - 28} 124 ${rightX - 10} 97 C${rightX - 30} 108 ${leftX + 30} 108 ${leftX + 10} 97 Z"
            fill="${foldShadow}" />
        `
        : `
          <path d="M${leftX} 104 C${leftX + 26} 116 ${rightX - 26} 116 ${rightX} 104 L${rightX - 8} 97 C${rightX - 28} 106 ${leftX + 28} 106 ${leftX + 8} 97 Z"
            fill="${baseDark}" stroke="${outlineStroke}" stroke-width="1.8" />
        `;

    const hoodOverlay = (leftX: number, rightX: number) =>
      withHood ? standardHood : necklessCollar(leftX, rightX);

    const torsoTopClose = (leftX: number, rightX: number) =>
      withHood
        ? `${leftX} 104 Z`
        : side === 'front'
          ? `C${rightX - 26} 130 ${leftX + 26} 130 ${leftX} 104 Z`
          : `C${rightX - 26} 112 ${leftX + 26} 112 ${leftX} 104 Z`;

    if (silhouette === 'hoodie-oversize') {
      const guideRect =
        side === 'front'
          ? `<rect x="160" y="175" width="180" height="180" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`
          : withHood
            ? `<rect x="155" y="242" width="190" height="190" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`
            : `<rect x="155" y="148" width="190" height="284" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`;

      const pocketFront =
        side === 'front'
          ? `
            <path d="M166 372 L334 372 L354 460 C295 468 205 468 146 460 Z"
              fill="${baseLight}" stroke="${seamStroke}" stroke-width="1.8" />
            <path d="M166 372 L146 460" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
            <path d="M334 372 L354 460" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
          `
          : '';

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
          <defs>
            <linearGradient id="hoodieBodyGrad" x1="0" y1="0" x2="1" y2="0.85">
              <stop offset="0%" stop-color="${baseLight}" />
              <stop offset="52%" stop-color="${colorHex}" />
              <stop offset="100%" stop-color="${baseDark}" />
            </linearGradient>
          </defs>
          <path d="M186 104 L98 138 L22 332 L52 454 L104 448 L114 338 L124 244 L120 504 C194 520 306 520 380 504 L376 244 L386 338 L396 448 L448 454 L478 332 L402 138 L314 104 ${torsoTopClose(186, 314)}"
            fill="url(#hoodieBodyGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
          <path d="M122 486 C194 498 306 498 378 486 L380 518 C306 530 194 530 120 518 Z"
            fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
          <path d="M50 436 L106 432 L104 456 L52 460 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="1.8" />
          <path d="M394 432 L450 436 L448 460 L396 456 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="1.8" />
          <path d="M104 136 L124 244" fill="none" stroke="${seamStroke}" stroke-width="1.6" stroke-dasharray="3 3" />
          <path d="M396 136 L376 244" fill="none" stroke="${seamStroke}" stroke-width="1.6" stroke-dasharray="3 3" />
          <path d="M156 180 Q144 330 156 482" fill="none" stroke="${foldShadow}" stroke-width="7" opacity="0.5" />
          <path d="M344 180 Q356 330 344 482" fill="none" stroke="${foldShadow}" stroke-width="7" opacity="0.5" />
          ${hoodOverlay(186, 314)}
          ${pocketFront}
          ${showPrintGuide ? guideRect : ''}
        </svg>
      `;
    }

    if (silhouette === 'hoodie-zip') {
      const guideRect =
        side === 'front'
          ? `<rect x="165" y="175" width="70" height="145" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />
             <rect x="265" y="175" width="70" height="145" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`
          : withHood
            ? `<rect x="165" y="242" width="170" height="185" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`
            : `<rect x="165" y="148" width="170" height="279" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`;

      const zipStartY = withHood ? 136 : 122;
      const zipPullY = withHood ? 148 : 134;
      const zipAndPockets =
        side === 'front'
          ? `
            <!-- Center Metal Zipper Track -->
            <line x1="250" y1="${zipStartY}" x2="250" y2="512" stroke="#1E2024" stroke-width="6" />
            <line x1="250" y1="${zipStartY}" x2="250" y2="512" stroke="#C6A87D" stroke-width="2.2" stroke-dasharray="3 2" />
            <!-- Zipper Pull -->
            <rect x="245.5" y="${zipPullY}" width="9" height="15" rx="2" fill="#C6A87D" stroke="#090A0C" stroke-width="1" />
            <!-- Split Front Pockets -->
            <path d="M168 368 L238 368 L238 458 L150 452 Z" fill="${baseLight}" stroke="${seamStroke}" stroke-width="1.7" />
            <path d="M262 368 L332 368 L350 452 L262 458 Z" fill="${baseLight}" stroke="${seamStroke}" stroke-width="1.7" />
          `
          : '';

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
          <defs>
            <linearGradient id="hoodieBodyGrad" x1="0" y1="0" x2="1" y2="0.85">
              <stop offset="0%" stop-color="${baseLight}" />
              <stop offset="52%" stop-color="${colorHex}" />
              <stop offset="100%" stop-color="${baseDark}" />
            </linearGradient>
          </defs>
          <path d="M188 104 L118 132 L46 318 L72 444 L116 440 L122 330 L140 232 L138 492 C202 504 298 504 362 492 L360 232 L378 330 L384 440 L428 444 L454 318 L382 132 L312 104 ${torsoTopClose(188, 312)}"
            fill="url(#hoodieBodyGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
          <path d="M138 476 C202 486 298 486 362 476 L362 506 C298 518 202 518 138 506 Z"
            fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
          <path d="M70 426 L117 424 L116 446 L72 448 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="1.8" />
          <path d="M383 424 L430 426 L428 448 L384 446 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="1.8" />
          <path d="M134 128 L142 232" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
          <path d="M366 128 L358 232" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
          ${hoodOverlay(188, 312)}
          ${zipAndPockets}
          ${showPrintGuide ? guideRect : ''}
        </svg>
      `;
    }

    if (silhouette === 'hoodie-boxy') {
      const guideRect =
        side === 'front'
          ? `<rect x="160" y="170" width="180" height="170" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`
          : withHood
            ? `<rect x="160" y="238" width="180" height="175" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`
            : `<rect x="160" y="148" width="180" height="265" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`;

      const boxyPocket =
        side === 'front'
          ? `
            <path d="M168 355 L332 355 L348 435 C295 442 205 442 152 435 Z"
              fill="${baseLight}" stroke="${seamStroke}" stroke-width="1.8" />
          `
          : '';

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
          <defs>
            <linearGradient id="hoodieBodyGrad" x1="0" y1="0" x2="1" y2="0.85">
              <stop offset="0%" stop-color="${baseLight}" />
              <stop offset="52%" stop-color="${colorHex}" />
              <stop offset="100%" stop-color="${baseDark}" />
            </linearGradient>
          </defs>
          <!-- Wide Cropped Boxy Hoodie (open straight hem, no cinched band) -->
          <path d="M188 104 L106 134 L34 316 L64 434 L112 430 L118 320 L126 232 L122 464 L378 464 L374 232 L382 320 L388 430 L436 434 L466 316 L394 134 L312 104 ${torsoTopClose(188, 312)}"
            fill="url(#hoodieBodyGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
          <path d="M62 414 L113 412 L112 434 L64 436 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="1.8" />
          <path d="M387 412 L438 414 L436 436 L388 434 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="1.8" />
          <path d="M124 448 L376 448" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="4 3" />
          <path d="M114 132 L126 232" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
          <path d="M386 132 L374 232" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
          ${hoodOverlay(188, 312)}
          ${boxyPocket}
          ${showPrintGuide ? guideRect : ''}
        </svg>
      `;
    }

    // Default: hoodie-classic
    const guideRect =
      side === 'front'
        ? `<rect x="170" y="175" width="160" height="175" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`
        : withHood
          ? `<rect x="165" y="242" width="170" height="185" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`
          : `<rect x="165" y="148" width="170" height="279" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />`;

    const frontPocket =
      side === 'front'
        ? `
          <path d="M174 365 L326 365 L344 452 C292 460 208 460 156 452 Z"
            fill="${baseLight}" stroke="${seamStroke}" stroke-width="1.8" />
          <path d="M174 365 L156 452" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
          <path d="M326 365 L344 452" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
        `
        : '';

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
        <defs>
          <linearGradient id="hoodieBodyGrad" x1="0" y1="0" x2="1" y2="0.85">
            <stop offset="0%" stop-color="${baseLight}" />
            <stop offset="52%" stop-color="${colorHex}" />
            <stop offset="100%" stop-color="${baseDark}" />
          </linearGradient>
        </defs>
        <path d="M188 104 L118 132 L46 318 L72 444 L116 440 L122 330 L140 232 L138 492 C202 504 298 504 362 492 L360 232 L378 330 L384 440 L428 444 L454 318 L382 132 L312 104 ${torsoTopClose(188, 312)}"
          fill="url(#hoodieBodyGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
        <path d="M138 476 C202 486 298 486 362 476 L362 506 C298 518 202 518 138 506 Z"
          fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
        <path d="M70 426 L117 424 L116 446 L72 448 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="1.8" />
        <path d="M383 424 L430 426 L428 448 L384 446 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="1.8" />
        <path d="M134 128 L142 232" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
        <path d="M366 128 L358 232" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="3 3" />
        <path d="M168 175 Q156 320 166 472" fill="none" stroke="${foldShadow}" stroke-width="6" opacity="0.5" />
        <path d="M332 175 Q344 320 334 472" fill="none" stroke="${foldShadow}" stroke-width="6" opacity="0.5" />
        ${hoodOverlay(188, 312)}
        ${frontPocket}
        ${showPrintGuide ? guideRect : ''}
      </svg>
    `;
  }

  // =====================================================================
  // 3. PANTS (cargo, baggy, straight)
  // =====================================================================
  if (silhouette.startsWith('pants-')) {
    const legGuideRect = `
      <rect x="135" y="135" width="90" height="230" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />
      <rect x="275" y="135" width="90" height="230" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />
    `;

    const waistDetails =
      side === 'front'
        ? `
          <!-- Waistband + Button + Fly + Belt Loops -->
          <path d="M150 62 L350 62 L354 94 L146 94 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
          <path d="M250 94 L250 176 Q250 188 238 192" fill="none" stroke="${seamStroke}" stroke-width="1.6" />
          <circle cx="250" cy="78" r="5" fill="#C6A87D" stroke="#090A0C" stroke-width="1" />
          <!-- Belt Loops -->
          <rect x="166" y="60" width="8" height="36" fill="${baseLight}" stroke="${seamStroke}" stroke-width="1" />
          <rect x="212" y="60" width="8" height="36" fill="${baseLight}" stroke="${seamStroke}" stroke-width="1" />
          <rect x="280" y="60" width="8" height="36" fill="${baseLight}" stroke="${seamStroke}" stroke-width="1" />
          <rect x="326" y="60" width="8" height="36" fill="${baseLight}" stroke="${seamStroke}" stroke-width="1" />
          <!-- Front Slant Pockets -->
          <path d="M148 96 Q172 135 140 165" fill="none" stroke="${seamStroke}" stroke-width="1.6" />
          <path d="M352 96 Q328 135 360 165" fill="none" stroke="${seamStroke}" stroke-width="1.6" />
        `
        : `
          <!-- Back Waistband + Yoke + Back Pockets -->
          <path d="M150 62 L350 62 L354 94 L146 94 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
          <path d="M144 118 L250 132 L356 118" fill="none" stroke="${seamStroke}" stroke-width="1.5" />
          <path d="M250 94 L250 222" fill="none" stroke="${seamStroke}" stroke-width="1.5" />
          <rect x="166" y="60" width="8" height="36" fill="${baseLight}" stroke="${seamStroke}" stroke-width="1" />
          <rect x="246" y="60" width="8" height="36" fill="${baseLight}" stroke="${seamStroke}" stroke-width="1" />
          <rect x="326" y="60" width="8" height="36" fill="${baseLight}" stroke="${seamStroke}" stroke-width="1" />
          <!-- Back Patch Pockets -->
          <path d="M168 136 L228 136 L226 196 L198 206 L170 196 Z" fill="${baseLight}" stroke="${seamStroke}" stroke-width="1.6" />
          <path d="M272 136 L332 136 L330 196 L302 206 L274 196 Z" fill="${baseLight}" stroke="${seamStroke}" stroke-width="1.6" />
        `;

    if (silhouette === 'pants-cargo') {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
          <defs>
            <linearGradient id="pantsGrad" x1="0" y1="0" x2="1" y2="0.85">
              <stop offset="0%" stop-color="${baseLight}" />
              <stop offset="52%" stop-color="${colorHex}" />
              <stop offset="100%" stop-color="${baseDark}" />
            </linearGradient>
          </defs>
          <!-- Cargo Pants Legs -->
          <path d="M150 62 L350 62 L366 205 L384 516 L282 522 L250 228 L218 522 L116 516 L134 205 Z"
            fill="url(#pantsGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
          <!-- Center Inseam Shadow -->
          <path d="M250 228 L218 522 L204 520 L242 222 Z" fill="${foldShadow}" />
          <path d="M250 228 L282 522 L296 520 L258 222 Z" fill="${foldShadow}" />
          <!-- Outer 3D Cargo Thigh Pockets -->
          <path d="M124 238 L168 242 L164 342 L116 336 Z" fill="${baseLight}" stroke="${outlineStroke}" stroke-width="1.8" />
          <path d="M124 238 L168 242 L167 264 L122 260 Z" fill="${baseDark}" stroke="${seamStroke}" stroke-width="1.4" />
          <path d="M376 238 L332 242 L336 342 L384 336 Z" fill="${baseLight}" stroke="${outlineStroke}" stroke-width="1.8" />
          <path d="M376 238 L332 242 L333 264 L378 260 Z" fill="${baseDark}" stroke="${seamStroke}" stroke-width="1.4" />
          <!-- Knee Pleats -->
          <path d="M135 372 Q170 380 208 372" fill="none" stroke="${seamStroke}" stroke-width="1.4" stroke-dasharray="3 3" />
          <path d="M292 372 Q330 380 365 372" fill="none" stroke="${seamStroke}" stroke-width="1.4" stroke-dasharray="3 3" />
          <!-- Hem Stitching -->
          <path d="M118 504 L216 510" fill="none" stroke="${seamStroke}" stroke-width="1.4" stroke-dasharray="4 3" />
          <path d="M284 510 L382 504" fill="none" stroke="${seamStroke}" stroke-width="1.4" stroke-dasharray="4 3" />
          ${waistDetails}
          ${showPrintGuide ? legGuideRect : ''}
        </svg>
      `;
    }

    if (silhouette === 'pants-baggy') {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
          <defs>
            <linearGradient id="pantsGrad" x1="0" y1="0" x2="1" y2="0.85">
              <stop offset="0%" stop-color="${baseLight}" />
              <stop offset="52%" stop-color="${colorHex}" />
              <stop offset="100%" stop-color="${baseDark}" />
            </linearGradient>
          </defs>
          <!-- Wide Baggy Streetwear Silhouette -->
          <path d="M150 62 L350 62 L374 205 L408 518 L272 524 L250 230 L228 524 L92 518 L126 205 Z"
            fill="url(#pantsGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
          <path d="M250 230 L228 524 L210 522 L240 224 Z" fill="${foldShadow}" />
          <path d="M250 230 L272 524 L290 522 L260 224 Z" fill="${foldShadow}" />
          <!-- Relaxed Baggy Drape Folds -->
          <path d="M155 245 Q138 380 144 504" fill="none" stroke="${foldShadow}" stroke-width="7" stroke-linecap="round" opacity="0.55" />
          <path d="M345 245 Q362 380 356 504" fill="none" stroke="${foldShadow}" stroke-width="7" stroke-linecap="round" opacity="0.55" />
          <path d="M108 465 Q160 482 218 468" fill="none" stroke="${foldShadow}" stroke-width="4" opacity="0.45" />
          <path d="M282 468 Q340 482 392 465" fill="none" stroke="${foldShadow}" stroke-width="4" opacity="0.45" />
          <path d="M94 504 L226 510" fill="none" stroke="${seamStroke}" stroke-width="1.4" stroke-dasharray="4 3" />
          <path d="M274 510 L406 504" fill="none" stroke="${seamStroke}" stroke-width="1.4" stroke-dasharray="4 3" />
          ${waistDetails}
          ${showPrintGuide ? legGuideRect : ''}
        </svg>
      `;
    }

    // Default: pants-straight
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
        <defs>
          <linearGradient id="pantsGrad" x1="0" y1="0" x2="1" y2="0.85">
            <stop offset="0%" stop-color="${baseLight}" />
            <stop offset="52%" stop-color="${colorHex}" />
            <stop offset="100%" stop-color="${baseDark}" />
          </linearGradient>
        </defs>
        <!-- Tailored Straight-Leg Trousers -->
        <path d="M150 62 L350 62 L360 205 L368 518 L280 522 L250 222 L220 522 L132 518 L140 205 Z"
          fill="url(#pantsGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
        <!-- Tailored Central Crease -->
        <path d="M188 145 L176 508" fill="none" stroke="${seamStroke}" stroke-width="1.2" opacity="0.7" />
        <path d="M312 145 L324 508" fill="none" stroke="${seamStroke}" stroke-width="1.2" opacity="0.7" />
        <path d="M250 222 L220 522 L208 520 L242 218 Z" fill="${foldShadow}" />
        <path d="M250 222 L280 522 L292 520 L258 218 Z" fill="${foldShadow}" />
        <path d="M134 506 L218 510" fill="none" stroke="${seamStroke}" stroke-width="1.4" stroke-dasharray="4 3" />
        <path d="M282 510 L366 506" fill="none" stroke="${seamStroke}" stroke-width="1.4" stroke-dasharray="4 3" />
        ${waistDetails}
        ${showPrintGuide ? legGuideRect : ''}
      </svg>
    `;
  }

  // =====================================================================
  // 4. JOGGERS (classic, oversize, cargo)
  // =====================================================================
  const joggerGuideRect = `
    <rect x="135" y="135" width="90" height="225" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />
    <rect x="275" y="135" width="90" height="225" fill="none" stroke="${guideStroke}" stroke-width="1.5" stroke-dasharray="6 5" />
  `;

  const joggerWaist =
    side === 'front'
      ? `
        <!-- Elasticated Ribbed Waistband with Drawstrings -->
        <path d="M150 62 L350 62 L354 98 L146 98 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
        <line x1="150" y1="74" x2="350" y2="74" stroke="${seamStroke}" stroke-width="1" stroke-dasharray="3 3" />
        <line x1="148" y1="86" x2="352" y2="86" stroke="${seamStroke}" stroke-width="1" stroke-dasharray="3 3" />
        <path d="M238 82 C233 114 234 140 236 164" fill="none" stroke="${cordColor}" stroke-width="3.2" stroke-linecap="round" />
        <path d="M262 82 C267 114 266 140 264 164" fill="none" stroke="${cordColor}" stroke-width="3.2" stroke-linecap="round" />
        <rect x="233.5" y="161" width="5" height="10" rx="1.5" fill="#C6A87D" stroke="#090A0C" stroke-width="0.8" />
        <rect x="261.5" y="161" width="5" height="10" rx="1.5" fill="#C6A87D" stroke="#090A0C" stroke-width="0.8" />
        <path d="M148 100 Q174 138 140 168" fill="none" stroke="${seamStroke}" stroke-width="1.5" />
        <path d="M352 100 Q326 138 360 168" fill="none" stroke="${seamStroke}" stroke-width="1.5" />
      `
      : `
        <path d="M150 62 L350 62 L354 98 L146 98 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
        <line x1="150" y1="74" x2="350" y2="74" stroke="${seamStroke}" stroke-width="1" stroke-dasharray="3 3" />
        <line x1="148" y1="86" x2="352" y2="86" stroke="${seamStroke}" stroke-width="1" stroke-dasharray="3 3" />
        <path d="M250 98 L250 228" fill="none" stroke="${seamStroke}" stroke-width="1.5" />
        <path d="M274 134 L330 134 L328 192 L276 192 Z" fill="${baseLight}" stroke="${seamStroke}" stroke-width="1.6" />
      `;

  if (silhouette === 'jogger-oversize') {
    const legPath = withAnkleCuffs
      ? 'M150 62 L350 62 L378 212 L392 430 L368 494 L298 494 L276 420 L250 232 L224 420 L202 494 L132 494 L108 430 L122 212 Z'
      : 'M150 62 L350 62 L378 212 L392 430 L386 520 L290 522 L276 420 L250 232 L224 420 L210 522 L114 520 L108 430 L122 212 Z';
    const ankleMarkup = withAnkleCuffs
      ? `
        <!-- Ribbed Elastic Ankle Cuffs -->
        <path d="M134 490 L200 490 L198 522 L136 522 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
        <path d="M300 490 L366 490 L364 522 L302 522 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
        <path d="M148 492 L149 520 M162 492 L162 520 M176 492 L176 520 M190 492 L189 520" stroke="${seamStroke}" stroke-width="1" />
        <path d="M310 492 L311 520 M324 492 L324 520 M338 492 L338 520 M352 492 L351 520" stroke="${seamStroke}" stroke-width="1" />
      `
      : `
        <!-- Open Straight Hem (No Elastic Cuffs) -->
        <path d="M116 508 L208 510" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="4 3" />
        <path d="M292 510 L384 508" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="4 3" />
      `;
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
        <defs>
          <linearGradient id="joggerGrad" x1="0" y1="0" x2="1" y2="0.85">
            <stop offset="0%" stop-color="${baseLight}" />
            <stop offset="52%" stop-color="${colorHex}" />
            <stop offset="100%" stop-color="${baseDark}" />
          </linearGradient>
        </defs>
        <path d="${legPath}"
          fill="url(#joggerGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
        ${ankleMarkup}
        <path d="M152 245 Q138 370 148 480" fill="none" stroke="${foldShadow}" stroke-width="7" stroke-linecap="round" opacity="0.55" />
        <path d="M348 245 Q362 370 352 480" fill="none" stroke="${foldShadow}" stroke-width="7" stroke-linecap="round" opacity="0.55" />
        ${joggerWaist}
        ${showPrintGuide ? joggerGuideRect : ''}
      </svg>
    `;
  }

  if (silhouette === 'jogger-cargo') {
    const legPath = withAnkleCuffs
      ? 'M150 62 L350 62 L366 205 L368 415 L354 494 L294 494 L278 410 L250 226 L222 410 L206 494 L146 494 L132 415 L134 205 Z'
      : 'M150 62 L350 62 L366 205 L368 415 L364 520 L288 522 L278 410 L250 226 L222 410 L212 522 L136 520 L132 415 L134 205 Z';
    const ankleMarkup = withAnkleCuffs
      ? `
        <!-- Ribbed Elastic Ankle Cuffs -->
        <path d="M148 490 L204 490 L202 522 L150 522 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
        <path d="M296 490 L352 490 L350 522 L298 522 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
        <path d="M160 492 L160 520 M174 492 L174 520 M188 492 L188 520" stroke="${seamStroke}" stroke-width="1" />
        <path d="M310 492 L310 520 M324 492 L324 520 M338 492 L338 520" stroke="${seamStroke}" stroke-width="1" />
      `
      : `
        <!-- Open Straight Hem (No Elastic Cuffs) -->
        <path d="M138 508 L210 510" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="4 3" />
        <path d="M290 510 L362 508" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="4 3" />
      `;
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
        <defs>
          <linearGradient id="joggerGrad" x1="0" y1="0" x2="1" y2="0.85">
            <stop offset="0%" stop-color="${baseLight}" />
            <stop offset="52%" stop-color="${colorHex}" />
            <stop offset="100%" stop-color="${baseDark}" />
          </linearGradient>
        </defs>
        <path d="${legPath}"
          fill="url(#joggerGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
        <!-- Cargo Flap Pockets -->
        <path d="M126 236 L170 240 L166 334 L120 328 Z" fill="${baseLight}" stroke="${outlineStroke}" stroke-width="1.8" />
        <path d="M126 236 L170 240 L169 260 L124 256 Z" fill="${baseDark}" stroke="${seamStroke}" stroke-width="1.4" />
        <path d="M374 236 L330 240 L334 334 L380 328 Z" fill="${baseLight}" stroke="${outlineStroke}" stroke-width="1.8" />
        <path d="M374 236 L330 240 L331 260 L376 256 Z" fill="${baseDark}" stroke="${seamStroke}" stroke-width="1.4" />
        ${ankleMarkup}
        ${joggerWaist}
        ${showPrintGuide ? joggerGuideRect : ''}
      </svg>
    `;
  }

  // Default: jogger-classic
  const classicLegPath = withAnkleCuffs
    ? 'M150 62 L350 62 L362 205 L358 415 L348 494 L292 494 L276 410 L250 226 L224 410 L208 494 L152 494 L142 415 L138 205 Z'
    : 'M150 62 L350 62 L362 205 L358 415 L356 520 L286 522 L276 410 L250 226 L224 410 L214 522 L144 520 L142 415 L138 205 Z';
  const classicAnkleMarkup = withAnkleCuffs
    ? `
      <!-- Ribbed Elastic Ankle Cuffs -->
      <path d="M154 490 L206 490 L204 522 L156 522 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
      <path d="M294 490 L346 490 L344 522 L296 522 Z" fill="${baseDark}" stroke="${outlineStroke}" stroke-width="2" />
      <path d="M166 492 L166 520 M180 492 L180 520 M194 492 L194 520" stroke="${seamStroke}" stroke-width="1" />
      <path d="M306 492 L306 520 M320 492 L320 520 M334 492 L334 520" stroke="${seamStroke}" stroke-width="1" />
    `
    : `
      <!-- Open Straight Hem (No Elastic Cuffs) -->
      <path d="M146 508 L212 510" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="4 3" />
      <path d="M288 510 L354 508" fill="none" stroke="${seamStroke}" stroke-width="1.5" stroke-dasharray="4 3" />
    `;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 580">
      <defs>
        <linearGradient id="joggerGrad" x1="0" y1="0" x2="1" y2="0.85">
          <stop offset="0%" stop-color="${baseLight}" />
          <stop offset="52%" stop-color="${colorHex}" />
          <stop offset="100%" stop-color="${baseDark}" />
        </linearGradient>
      </defs>
      <path d="${classicLegPath}"
        fill="url(#joggerGrad)" stroke="${outlineStroke}" stroke-width="2.5" stroke-linejoin="round" />
      <path d="M250 226 L224 410 L212 406 L242 222 Z" fill="${foldShadow}" />
      <path d="M250 226 L276 410 L288 406 L258 222 Z" fill="${foldShadow}" />
      ${classicAnkleMarkup}
      ${joggerWaist}
      ${showPrintGuide ? joggerGuideRect : ''}
    </svg>
  `;
}

export const CustomGarmentSvg: React.FC<CustomGarmentSvgProps> = ({
  garmentType,
  silhouette,
  studioGarments,
  side,
  colorHex,
  showPrintGuide = true,
  withHood = true,
  withAnkleCuffs = true,
  className = 'w-full h-full',
}) => {
  const markup = React.useMemo(
    () =>
      buildGarmentSvgMarkup(
        garmentType,
        side,
        colorHex,
        showPrintGuide,
        silhouette,
        studioGarments,
        { withHood, withAnkleCuffs }
      ),
    [garmentType, side, colorHex, showPrintGuide, silhouette, studioGarments, withHood, withAnkleCuffs]
  );

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: markup }}
      aria-hidden="true"
    />
  );
};

export async function renderCustomGarmentPreview(params: {
  garmentType: CustomGarmentType;
  silhouette?: GarmentSilhouette;
  studioGarments?: StudioGarmentOption[];
  colorHex: string;
  layers: CustomLayer[];
  preferredSide: 'front' | 'back';
  withHood?: boolean;
  withAnkleCuffs?: boolean;
}): Promise<string> {
  const width = 400;
  const height = 464;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#141812';
  ctx.fillRect(0, 0, width, height);

  const frontLayers = params.layers.filter((l) => l.side === 'front');
  const backLayers = params.layers.filter((l) => l.side === 'back');
  const sideToRender =
    params.preferredSide === 'back' && backLayers.length > 0
      ? 'back'
      : frontLayers.length > 0
        ? 'front'
        : backLayers.length > 0
          ? 'back'
          : params.preferredSide;

  const svgMarkup = buildGarmentSvgMarkup(
    params.garmentType,
    sideToRender,
    params.colorHex,
    false,
    params.silhouette,
    params.studioGarments,
    { withHood: params.withHood, withAnkleCuffs: params.withAnkleCuffs }
  );
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const garmentImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('SVG load error'));
      img.src = svgUrl;
    });
    ctx.drawImage(garmentImg, 0, 0, width, height);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }

  const activeLayers = params.layers.filter((l) => l.side === sideToRender);
  for (const layer of activeLayers) {
    try {
      const layerImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Layer load error'));
        img.src = layer.src;
      });

      const targetW = (layer.scale / 100) * width;
      const aspect = layerImg.height > 0 && layerImg.width > 0 ? layerImg.height / layerImg.width : 1;
      const targetH = targetW * aspect;
      const cx = (layer.x / 100) * width;
      const cy = (layer.y / 100) * height;

      ctx.save();
      ctx.globalAlpha = Math.max(0.2, Math.min(1, layer.opacity));
      ctx.translate(cx, cy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.drawImage(layerImg, -targetW / 2, -targetH / 2, targetW, targetH);
      ctx.restore();
    } catch {
      // Skip broken layer image
    }
  }

  return canvas.toDataURL('image/jpeg', 0.84);
}
