import { clawd } from './primitives.mjs';

// All scenery stays inside the 260 × 760 margin and uses the host palette.
const ink = 'var(--ink)';
const paper = 'var(--paper)';
const soft = 'var(--soft)';
const line = 'var(--line)';
const panel = 'var(--panel)';
const accent = 'var(--accent)';
const g = (x, y, children, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">${children}</g>`;
const p = (d, fill = 'none', stroke = ink, width = 1.5) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const r = (x, y, w, h, fill = paper, stroke = ink, radius = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
const c = (x, y, radius, fill = 'none', stroke = ink, width = 1.5) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const dots = (x, y, w, h, opacity = .38) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#dots)" opacity="${opacity}"/>`;
const star = (x, y, s = 1) => g(x, y, p('M0 -6V6M-6 0H6', 'none', ink, 1), s);
const floor = (y = 710) => p(`M0 ${y}H260M18 ${y + 13}H90M151 ${y + 20}H240M0 ${y + 34}H45`, 'none', line);
const leaf = (x, y, angle = 0, s = 1) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${s})">${p('M0 0Q-15 -21 0 -31Q15 -19 0 0Z', soft)}${p('M0 -3V-24', 'none', line, 1)}</g>`;
const pot = (x, y, s = 1) => g(x, y, p('M-20 0H20L15 29H-15Z', soft) + r(-23, -5, 46, 8, paper) + p('M0 -5V-65M0 -32L-21 -53M0 -44L20 -67M0 -17L23 -38M0 -49L-15 -77', 'none', ink, 1) + leaf(-21, -53, -45, .8) + leaf(20, -67, 38, .8) + leaf(23, -38, 55, .8) + leaf(-15, -77, -35, .8), s);
const cloud = (x, y, s = 1) => g(x, y, p('M0 23H76Q89 22 86 12Q83 3 70 6Q65 -11 48 -5Q37 -14 26 -4Q15 -3 15 8Q1 5 0 23Z', paper, line) + p('M13 28H64', 'none', line, 1), s);
const books = (x, y, count = 8, height = 43) => {
  let out = '';
  for (let i = 0; i < count; i++) {
    const w = 9 + (i % 3) * 2;
    const h = height - (i % 4) * 4;
    out += r(x + i * 15, y - h, w, h, i % 3 === 0 ? soft : paper) + p(`M${x + i * 15 + 2} ${y - h + 7}h${w - 4}M${x + i * 15 + 2} ${y - 7}h${w - 4}`, 'none', line, 1);
  }
  return out;
};
const shelf = (x, y, w, rows = 4) => g(x, y, r(0, 0, w, rows * 75 + 16, panel) + dots(6, 5, w - 12, rows * 75 + 6, .3) + Array.from({ length: rows }, (_, i) => books(11, 64 + i * 75, Math.floor((w - 15) / 15), 42 + (i % 2) * 7) + r(4, 65 + i * 75, w - 8, 6, soft)).join(''));
const windowFrame = (x, y, w, h) => g(x, y, r(0, 0, w, h, soft) + dots(4, 4, w - 8, h - 8, .5) + r(5, 5, w - 10, h - 10, 'none') + p(`M${w / 2} 5V${h - 5}M5 ${h * .48}H${w - 5}`, 'none', ink, 3) + r(-5, h, w + 10, 9, paper));
const mug = (x, y, s = 1) => g(x, y, p('M-12 0H12V23Q0 29 -12 23Z', paper) + p('M12 4Q29 0 26 13Q25 20 13 17M-6 -7Q-12 -13 -5 -19M4 -6Q-2 -13 5 -21', 'none', ink, 1), s);
const rain = (x, y, w, h) => Array.from({ length: 16 }, (_, i) => { const px = x + (i * 29) % w; const py = y + (i * 43) % h; return p(`M${px} ${py}l-5 12`, 'none', ink, .75); }).join('');
const frame = (x, y, w, h, content) => g(x, y, r(0, 0, w, h, paper) + r(4, 4, w - 8, h - 8, 'none', line) + content);
const pebble = (x, y, s = 1) => g(x, y, p('M-10 0Q-7 -7 1 -5Q10 -4 12 2Q1 7 -10 0Z', soft, line, 1), s);

function detectiveLeft() {
  return frame(25, 37, 207, 220,
    r(8, 8, 191, 204, soft, 'none') + dots(9, 9, 189, 202, .46) +
    p('M30 43L151 62L83 151L35 111L152 62L157 174L83 151', 'none', accent, 1.3) +
    g(15, 23, r(0, 0, 64, 48, paper) + r(7, 7, 50, 28, soft, line) + p('M7 30L21 20L30 26L42 14L57 29', 'none', ink, 1)) +
    g(125, 29, r(0, 0, 56, 66, paper) + p('M10 14H44M10 22H39M10 30H44M10 42H31M10 50H37', 'none', line, 1)) +
    g(56, 119, r(0, 0, 61, 64, paper) + c(30, 23, 11, soft) + p('M11 51Q28 27 48 51Z', soft)) +
    g(137, 149, r(0, 0, 44, 38, paper) + p('M8 13H34M8 21H29', 'none', line, 1)) +
    [ [47,36], [153,40], [84,131], [158,160] ].map(([x,y]) => c(x,y,2.3,accent,'none')).join('')) +
    g(31, 303, r(0, 0, 91, 85, soft) + dots(6, 6, 79, 73) + p('M12 70V29H31V14H49V37H73V70M19 36H24M38 24H44M56 46H64', 'none', ink, 1) + rain(10, 5, 77, 64)) +
    p('M17 428H173M34 436V451M151 436V451', 'none', line) + books(35, 428, 6, 41) + mug(148,407,.65) +
    pot(76, 654, 1.25) + g(174, 616, r(-17,0,34,43,soft) + p('M-12 6H12M-12 14H12M-12 22H8','none',line,1)) +
    floor(700) + p('M18 717H116M134 735H226', 'none', line);
}
function detectiveRight() {
  return windowFrame(35, 40, 188, 241) + g(40, 45, rain(5, 2, 173, 226)) +
    g(50, 193, p('M0 78V18L14 3L28 18V78M40 78V31H68V78M78 78V5H111V78M121 78V38H157V78', soft) + p('M5 36H23M48 46H60M86 19H102M86 32H102M129 49H150', 'none', ink, 1)) +
    p('M147 312V366M123 367H170M150 312L177 341H122Z', soft) +
    g(32, 483, r(0, 0, 196, 14, soft) + r(10, 14, 12, 182, panel) + r(173, 14, 12, 182, panel) + r(113, 27, 62, 59, paper) + r(113, 92, 62, 54, paper) + p('M136 52H151M136 114H151', 'none', ink, 2) + dots(114,147,58,29)) +
    g(51, 447, r(0, 0, 65, 32, paper) + p('M6 6H59M6 13H44M6 20H54', 'none', line, 1)) +
    mug(183,450,.8) + g(140,409,p('M0 34L16 0L33 34Z',soft)+r(6,28,21,10,paper)) +
    clawd(75,575,'magnifier',1.26) +
    g(20, 680, p('M0 0H55L70 14H13Z',paper) + p('M15 7H43', 'none',line,1)) + floor(711);
}

function dizzyLeft() {
  return p('M14 115Q128 -18 246 115M25 115Q132 8 233 115', 'none', line, 1) +
    c(128, 110, 77, 'none', line, 1) + p('M50 110H207M128 33V187M67 63L185 158M69 159L185 63', 'none', line, .75) +
    g(130,110,`<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="180s" repeatCount="indefinite"/>${c(69,0,8,paper)}${star(-48,-47,.8)}${c(-20,71,4,soft)}</g>`) +
    star(34,227,.7) + star(197,231,.5) + c(91,251,2,ink,'none') + c(222,306,1.7,ink,'none') +
    g(27, 340, r(0,0,84,117,paper)+dots(6,6,72,105,.4)+c(42,50,29,'none',ink,1)+p('M17 50H68M42 21V80M24 29L62 71','none',line,.8)+star(42,50,.7)) +
    g(75, 570, p('M0 0L77 42L87 24L12 -19Z',paper)+r(-9,-24,18,34,soft)+p('M49 29V52M45 52L17 118M49 52L80 118M49 52V120','none',ink,2)+c(49,50,5,soft)) +
    p('M20 710H225', 'none',ink) + g(170,648,c(0,0,30,soft)+p('M-18 -4Q5 -25 21 -3M-18 12Q2 -5 22 10','none',line,1)+p('M0 31V46M-21 46H21','none',ink)) +
    star(190,491,.7) + star(32,520,.5) + floor(715);
}
function dizzyRight() {
  return g(130,35,p('M0 0V29M-76 29H76M-61 29V94M0 29V145M61 29V83','none',ink,1)+
    g(-62,109,p('M0 -17A18 18 0 1 0 16 11A21 21 0 0 1 0 -17Z',soft))+
    g(0,160,star(0,0,2))+c(61,99,14,paper)+dots(50,87,22,24,.4)+star(102,177,.55)) +
    g(32,272,c(94,50,53,'none',line,.8)+p('M25 83Q98 -14 177 28Q197 48 150 70Q65 113 19 80Z','none',ink,1)+c(94,50,25,soft)+dots(72,29,44,42,.3)+c(35,77,5,paper))+
    star(56,399,.6)+star(205,419,.7)+c(127,432,2,ink,'none')+
    g(33,519,p('M0 155Q85 97 195 146L195 185H0Z',panel)+dots(0,153,195,31,.5)+r(8,142,178,12,paper)+p('M25 155V177M166 155V177','none',ink,3))+
    clawd(80,577,'dizzy',1.22)+
    g(169,550,`<g><animateTransform attributeName="transform" type="rotate" values="-5;5;-5" dur="12s" repeatCount="indefinite"/>${star(0,0,.65)}${star(32,-18,.45)}${c(21,18,3,paper)}</g>`)+
    p('M23 720Q122 701 233 723', 'none',line);
}

function libraryLeft() {
  return shelf(21,29,205,5)+
    g(162,150,p('M0 0L-59 439M25 0L-34 439','none',ink,5)+Array.from({length:10},(_,i)=>p(`M${-i*5.9-1} ${i*44+18}l25 0`,'none',ink,3)).join(''))+
    g(29,460,r(0,0,74,95,paper)+r(5,5,64,85,'none',line)+p('M14 75V33Q22 10 37 21Q56 7 62 34V75M37 22V76M17 66Q29 60 37 68Q46 60 59 66','none',ink,1))+
    g(34,624,r(0,0,73,14,soft)+r(6,14,8,65,paper)+r(59,14,8,65,paper)+mug(37,-25,.8))+
    pot(181,660,.75)+floor(713);
}
function libraryRight() {
  return shelf(33,28,198,3)+
    g(66,312,r(0,0,131,117,paper)+dots(7,7,117,103,.3)+p('M21 88V46Q42 20 64 47Q89 20 110 46V88Q86 72 64 89Q43 72 21 88ZM64 47V89','none',ink,1.5)+star(64,24,.5))+
    g(219,443,p('M0 0V245M-23 245H15M-9 9L-42 67H10Z',soft)+p('M-34 68H4','none',ink,3)+p('M-37 74L-59 135M-4 74L16 136','none',line,.8))+
    g(34,573,p('M0 0Q-8 -22 13 -29H108Q128 -24 118 0L113 91H6Z',soft)+dots(8,3,104,76,.42)+p('M7 91L0 121M108 91L116 121','none',ink,3)+r(-9,20,22,62,paper,ink,8)+r(104,20,22,62,paper,ink,8))+
    clawd(61,572,'book',1.22)+
    g(172,677,c(0,0,28,paper)+p('M-20 7H21M-14 0H15','none',line)+p('M-17 28V44M17 28V44','none',ink,2)+mug(0,-27,.7))+
    g(19,706,p('M0 0H134L153 17H-12Z',paper)+p('M11 6H123M4 11H134','none',line,1))+floor(738);
}

function bubbleLeft() {
  return p('M18 300V83Q129 -27 240 83V300M18 93H240M129 31V300M69 48V300M189 48V300M18 181H240', 'none', line, 1.3)+
    dots(22,97,43,78,.2)+dots(193,185,43,110,.2)+
    g(58,20,p('M0 0V44','none',ink,1)+p('M-19 44H19L14 79H-14Z',paper)+c(0,61,11,'none',line,1)+leaf(0,75,0,.5))+
    g(196,23,p('M0 0V75','none',ink,1)+c(0,98,24,paper)+c(0,98,17,'none',line,1)+leaf(0,112,-20,.6))+
    pot(67,444,1.2)+pot(187,500,.85)+
    g(18,574,r(0,0,218,65,soft)+Array.from({length:9},(_,i)=>p(`M${i*26} 0V65`,'none',paper,2)).join('')+p('M0 22H218M0 44H218','none',paper,2)+r(-4,65,226,13,paper))+
    g(129,531,p('M-10 43V0H10V43','none',ink,2)+p('M0 0Q-17 -22 -36 7M0 0Q18 -23 36 7','none',ink,1)+p('M-36 8V24M36 8V24','none',line,1)+c(0,-5,7,paper))+
    c(73,524,10,'none',line,1)+c(192,562,5,'none',line,1)+pebble(49,699)+pebble(196,718,.7)+floor(736);
}
const bubble = (x,y,s=1) => g(x,y,c(0,0,23,'none',ink,1)+p('M-14 -13Q-6 -22 7 -17M14 12L17 7','none',line,2),s);
function bubbleRight() {
  return p('M24 285V72Q125 -8 232 72V285M24 92H232M127 23V285M75 44V285M180 44V285', 'none',line,1)+
    g(164,29,p('M0 0V39','none',ink,1)+p('M-24 39H24L17 69H-17Z',soft)+leaf(-15,43,-45,.6)+leaf(14,48,52,.7)+p('M0 66Q-9 113 2 139Q14 162 2 183','none',ink,1)+leaf(2,126,45,.5)+leaf(3,158,-40,.55))+
    bubble(57,153,.7)+bubble(170,259,1.1)+bubble(75,355,.42)+
    `<g><animateTransform attributeName="transform" type="translate" values="0 5;0 -7;0 5" dur="14s" repeatCount="indefinite"/>${bubble(195,408,.57)}</g>`+
    g(27,590,r(0,0,205,80,soft)+p('M0 26H205M0 53H205M26 0V80M52 0V80M78 0V80M104 0V80M130 0V80M156 0V80M182 0V80','none',paper,2)+r(-5,80,215,10,paper))+
    clawd(77,531,'bubble',1.25)+
    g(203,557,p('M-11 0H11L9 30H-9Z',paper)+p('M-12 0H12M0 -4V-26','none',ink,1.5)+c(0,-34,9,'none',ink,2))+
    pot(32,690,.65)+pebble(151,710)+floor(731);
}

const skyline = (x,y,s=1) => g(x,y,p('M0 119V63H20V39H48V119H60V20H83V119H93V63H122V3H145V119H159V48H184V119H204V77H225V119Z',soft,line,1)+Array.from({length:14},(_,i)=>r(6+(i*17)%212,76-((i*13)%50),4,8,paper,'none')).join(''),s);
function capeLeft() {
  return cloud(29,66,1.08)+cloud(135,173,.73)+c(204,44,19,'none',line,1)+
    skyline(12,305,1)+
    g(45,510,p('M-11 -13L0 -37H104L116 -13Z',soft)+r(-6,-13,117,80,paper)+dots(-2,-9,109,70,.5)+p('M-5 7H110M-5 44H110M7 67L-9 183M95 67L112 183M1 94H102M-3 132H107M8 75L103 176M94 75L-1 176','none',ink,2)+r(50,-35,5,101,soft)+p('M53 68V166M65 68V166M53 89H65M53 107H65M53 125H65M53 143H65','none',ink,1.2))+
    p('M0 701H260M0 716H260M26 716V760M83 716V760M140 716V760M197 716V760', 'none',ink,1)+
    g(192,647,r(0,0,39,54,soft)+p('M4 7H35M4 15H35M4 23H35','none',ink,1))+pebble(17,738,.5);
}
function capeRight() {
  return cloud(23,94,.8)+cloud(132,204,1)+
    g(8,31,p('M0 0Q124 35 245 -3','none',ink,1.2)+p('M32 8L29 17M86 16V26M145 14L147 25M206 6L209 16','none',ink,2)+
    p('M22 16L42 19L43 62L18 59Z',paper)+p('M76 25L96 25L101 66H72Z',soft)+p('M134 24L158 22L165 35L156 40L155 65H135L135 40L126 36Z',paper)+p('M198 16L218 12L223 54L203 58Z',soft)+dots(20,23,19,30,.3))+
    skyline(10,353,1.06)+
    p('M0 559H260M0 571H260M0 640H260M0 710H260M33 571V640M111 571V640M191 571V640M72 640V710M151 640V710M230 640V710','none',line,1)+
    g(13,546,r(0,0,235,12,paper)+dots(0,28,235,90,.25))+
    g(32,690,r(0,0,204,17,soft)+r(12,17,180,46,paper)+p('M20 30H173M20 38H173','none',line,1))+
    clawd(92,591,'cape',1.3)+
    g(42,613,p('M0 69V16M-8 16H8M0 16L-12 0H12Z',paper)+p('M-10 69H10','none',ink,2))+star(203,291,.7);
}

const grasses = (x,y,count=12,s=1) => g(x,y,Array.from({length:count},(_,i)=>{const px=i*15;return p(`M${px} 0q-3 -17 -8 -23M${px} 0q0 -24 7 -33M${px} 0q7 -14 13 -16`,'none',i%3===0?ink:line,1);}).join(''),s);
const kite = (x,y,s=1,tilt=0) => `<g transform="translate(${x} ${y}) rotate(${tilt}) scale(${s})">${p('M0 -36L25 0L0 40L-25 0Z',paper)}${p('M0 -36V40M-25 0H25','none',ink,1)}${p('M0 0L25 0L0 40Z',soft,line,1)}${p('M0 40Q-27 69 -2 91Q21 112 -8 135','none',ink,1)}${p('M-12 66L1 71L-10 78ZM1 99L15 106L1 112Z',paper)}</g>`;
function kiteLeft() {
  return cloud(21,46,.95)+cloud(148,216,.8)+
    g(91,150,`<g><animateTransform attributeName="transform" type="rotate" values="-3;3;-3" dur="16s" repeatCount="indefinite"/>${kite(0,0,.82,-13)}</g>`)+
    p('M9 358Q69 344 134 354M84 379Q142 365 220 370M22 289Q52 280 74 287','none',line,1)+
    p('M0 550Q113 480 260 534V760H0Z',soft,line,1)+dots(0,561,260,199,.24)+
    g(62,429,p('M0 0V254M-9 254H9','none',ink,2)+p('M0 0Q45 -8 91 21L89 54Q40 22 0 33Z',paper)+p('M20 0L20 35M42 5L42 40M64 12L64 47','none',ink,1)+p('M90 22L121 18M91 37L124 40M90 53L116 64','none',ink,1))+
    grasses(3,714,16,.95)+g(185,639,p('M0 26V0M-13 13H13M-9 4L9 22M-9 22L9 4','none',ink,1)+c(0,13,4,paper))+pebble(139,704,1.2);
}
function kiteRight() {
  return cloud(12,79,.83)+cloud(138,42,1.02)+kite(173,232,.62,21)+
    p('M59 188Q38 211 67 220M28 275Q88 258 119 272M123 382Q179 363 238 374','none',line,1)+
    p('M0 530Q125 474 260 539V760H0Z',soft,line,1)+dots(0,550,260,210,.25)+
    g(18,643,p('M18 0H176L208 63H-7Z',paper)+p('M23 9H179M17 22H185M10 35H191M2 48H198M47 0L33 63M80 0L76 63M113 0L118 63M146 0L162 63','none',line,1))+
    clawd(98,557,'kite',1.26)+p('M151 583Q202 459 173 268','none',ink,.8)+
    g(38,633,p('M-17 0H20L17 31H-14Z',soft)+p('M-17 6H19M-13 17H17M-8 0Q-6 -28 10 -25Q25 -21 16 0','none',ink,1)+p('M-7 1V28M5 1V28','none',line,1))+
    g(197,656,p('M-13 0H13L10 23H-10Z',paper)+p('M-6 -3L0 -20L8 -8','none',ink,1))+
    grasses(8,741,16,.94)+g(73,529,p('M0 0q-12 -10 -16 0M0 0q10 -9 16 0','none',ink,1));
}

export const scenesB = {
  magnifier: { title: 'The tiny detective', description: 'Rain on the glass, a wall of clues, and one very observant Clawd.', accent: '#b76d48', light: '#f4efe4', dark: '#242522', left: detectiveLeft, right: detectiveRight },
  dizzy: { title: 'A little spacey', description: 'A quiet planetarium for very big thoughts and very slow orbits.', accent: '#a58d6d', light: '#f0eee7', dark: '#202429', left: dizzyLeft, right: dizzyRight },
  book: { title: 'One more chapter', description: 'Shelves to the ceiling, a reading lamp, and a companion in glasses.', accent: '#ab6e4d', light: '#f3ebdd', dark: '#28241f', left: libraryLeft, right: libraryRight },
  bubble: { title: 'The bubble conservatory', description: 'A tiled fountain, glass planters, and bubbles drifting through the leaves.', accent: '#7f9283', light: '#edf0e6', dark: '#212a25', left: bubbleLeft, right: bubbleRight },
  cape: { title: 'The rooftop lookout', description: 'Laundry in the breeze and a tiny hero keeping an eye on the neighborhood.', accent: '#ac674d', light: '#eeeae1', dark: '#25262a', left: capeLeft, right: capeRight },
  kite: { title: 'A very good breeze', description: 'Paper kites over a grassy hill, with a picnic waiting below.', accent: '#a97b4f', light: '#f2efdf', dark: '#252a23', left: kiteLeft, right: kiteRight },
};
