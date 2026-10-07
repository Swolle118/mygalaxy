import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { animate as animeAnimate } from "animejs";
// vanilla-disintegrate is lazy-loaded below (separate chunk, fetched during the loading screen).
import starImage1 from "../images/(1).webp";
import starImage2 from "../images/(2).webp";
import starImage3 from "../images/(3).webp";
import starImage4 from "../images/(4).webp";
import starImage5 from "../images/(5).webp";
import starImage6 from "../images/(6).webp";
import starImage7 from "../images/(7).webp";
import starImage8 from "../images/(8).webp";
import starImage9 from "../images/(9).webp";
import starImage10 from "../images/(10).webp";
import starImage11 from "../images/(11).webp";

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

// Works on GitHub Pages project sites (served from /repo-name/) as well as at a domain root.
// Put the 3dassests folder inside Vite's /public directory.
const BASE = import.meta.env?.BASE_URL ?? "/";
const asset = (path) => `${BASE}${path}`;

const LOW_POWER =
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
const MAX_DPR = LOW_POWER ? 1.5 : 2;
const getDpr = () => Math.min(window.devicePixelRatio || 1, MAX_DPR);
const STAR_SCALE = LOW_POWER ? 0.5 : 1;
const CUBE_SIZE = LOW_POWER ? 256 : 512;

/* ------------------------------------------------------------------ */
/* Loading screen                                                      */
/* ------------------------------------------------------------------ */

const loadingStyles = document.createElement("style");
loadingStyles.textContent = `
  .loader {
    position: fixed; inset: 0; z-index: 1000;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2rem;
    background: #01020a; color: #edf5ff;
    font: 0.85rem/1.2 Georgia, serif; letter-spacing: 0.18em;
    transition: opacity 900ms ease;
  }
  .loader.is-hidden { opacity: 0; pointer-events: none; }
  .loader__bar { width: min(60vw, 280px); height: 2px; background: rgba(214,235,255,0.18); overflow: hidden; border-radius: 2px; }
  .loader__fill {
    height: 100%; background: #cfe6ff; box-shadow: 0 0 12px rgba(170,214,255,0.9);
    transform: scaleX(0); transform-origin: left; transition: transform 250ms ease;
  }
  .loader__enter {
    display: none; padding: 0.8rem 1.8rem; border-radius: 999px; cursor: pointer;
    border: 1px solid rgba(214,235,255,0.7); background: rgba(40,60,120,0.25);
    color: #edf5ff; font: inherit; letter-spacing: 0.2em;
    box-shadow: 0 0 24px rgba(120,160,255,0.45);
    animation: loader-pulse 1.6s ease-in-out infinite alternate;
  }
  @keyframes loader-pulse { from { opacity: 0.65; } to { opacity: 1; } }
`;
document.head.appendChild(loadingStyles);

const loader = document.createElement("div");
loader.className = "loader";
loader.innerHTML = `
  <div class="loader__label">GATHERING STARS… <span class="loader__pct">0%</span></div>
  <div class="loader__bar"><div class="loader__fill"></div></div>
  <button class="loader__enter" type="button">TAP TO BEGIN ✨</button>
`;
document.body.appendChild(loader);
const loaderFill = loader.querySelector(".loader__fill");
const loaderPct = loader.querySelector(".loader__pct");
const loaderLabel = loader.querySelector(".loader__label");
const loaderEnter = loader.querySelector(".loader__enter");

const loadState = { assets: 0, images: 0, audio: 0, sky: 0 };
const LOAD_WEIGHTS = { assets: 0.5, images: 0.2, audio: 0.15, sky: 0.15 };
function updateLoadProgress() {
  let p = 0;
  for (const k in loadState) p += loadState[k] * LOAD_WEIGHTS[k];
  p = Math.min(p, 1);
  loaderFill.style.transform = `scaleX(${p})`;
  loaderPct.textContent = `${Math.round(p * 100)}%`;
}

// One manager shared by every GLB + the ground texture.
let resolveAssets;
const assetsReady = new Promise((r) => (resolveAssets = r));
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = (_url, loaded, total) => {
  loadState.assets = total ? loaded / total : 0;
  updateLoadProgress();
};
loadingManager.onLoad = () => {
  loadState.assets = 1;
  updateLoadProgress();
  resolveAssets();
};
// A failed file still counts as "done", so one bad asset can't hang the screen.
loadingManager.onError = (url) => console.warn("Failed to load", url);
// Absolute safety net: never sit on the loading screen forever.
window.setTimeout(() => {
  loadState.assets = 1;
  resolveAssets();
}, 45000);

/* ------------------------------------------------------------------ */
/* Core setup                                                          */
/* ------------------------------------------------------------------ */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01020a);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 2500);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(getDpr());
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.touchAction = "none";
document.body.appendChild(renderer.domElement);

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const gauss = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const randDir = () => {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return new THREE.Vector3(s * Math.cos(t), u, s * Math.sin(t));
};
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

// anime.js v4 takes ONE params object (properties + options together).
// Wrapped in a promise, with a timeout fallback so a sequence can never stall.
const tween = (el, props, duration, ease) =>
  new Promise((resolve) => {
    animeAnimate(el, { ...props, duration, ease, onComplete: resolve });
    window.setTimeout(resolve, duration + 150);
  });

const vibrate = () => {
  if (typeof navigator.vibrate === "function") navigator.vibrate(60);
};

/* ------------------------------------------------------------------ */
/* Music                                                               */
/* ------------------------------------------------------------------ */

const backgroundMusic = new Audio(new URL("../song.mp3", import.meta.url).href);
backgroundMusic.loop = true;
backgroundMusic.volume = 0.9;
backgroundMusic.preload = "auto";

// Resolves when the track can play through. iOS Safari may never fire
// canplaythrough, so a timeout keeps the loading screen from hanging.
const audioReady = new Promise((resolve) => {
  const done = () => {
    loadState.audio = 1;
    updateLoadProgress();
    resolve();
  };
  backgroundMusic.addEventListener("canplaythrough", done, { once: true });
  backgroundMusic.addEventListener("error", done, { once: true });
  window.setTimeout(done, 8000);
});
backgroundMusic.load();
// Playback starts from the "TAP TO BEGIN" button (a user gesture) in boot().

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const messageStyles = document.createElement("style");
messageStyles.textContent = `
  .star-popup {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1.25rem;
    pointer-events: none;
    opacity: 0;
    z-index: 20;
  }
  .star-popup__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    width: min(78vw, 390px);
  }
  .star-popup__media {
    position: relative;
    width: min(72vw, 360px);
    aspect-ratio: 3 / 4;
    overflow: hidden;
    border: 1px solid rgba(214, 235, 255, 0.86);
    border-radius: 0.55rem;
    background: rgba(10, 16, 34, 0.9);
    box-shadow: 0 0 16px rgba(170, 214, 255, 0.95), 0 0 48px rgba(84, 124, 255, 0.7), inset 0 0 20px rgba(255, 255, 255, 0.14);
    animation: star-popup-glow 1.8s ease-in-out infinite alternate;
  }
  .star-popup__image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .star-popup__text {
    width: 100%;
    max-height: calc(3 * 1.35em);
    overflow: hidden;
    color: #edf5ff;
    font-size: clamp(0.68rem, 2.2vw, 1rem);
    line-height: 1.35;
    letter-spacing: 0.14em;
    text-align: center;
    text-shadow: 0 0 12px rgba(173, 215, 255, 0.8);
  }
  .star-popup__text-track {
    display: block;
    width: 100%;
  }
  .star-popup__text-track.is-scrolling {
    animation: star-popup-text-scroll var(--text-scroll-duration) linear 480ms 1 forwards;
    will-change: transform;
  }
  .star-counter {
    position: fixed;
    left: 1rem;
    bottom: 1rem;
    z-index: 10;
    color: rgba(237, 245, 255, 0.82);
    font: 0.78rem/1.2 sans-serif;
    letter-spacing: 0.14em;
    pointer-events: none;
  }
  .star-counter__trigger {
    display: none;
    margin-top: 0.35rem;
    color: #ffd9f2;
    text-shadow: 0 0 12px rgba(255, 126, 210, 0.9);
  }
  .star-counter__trigger.is-visible {
    display: block;
  }
  .birthday-finale {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: #000;
  }
  .birthday-finale__message,
  .birthday-finale__outro-title {
    grid-area: 1 / 1;
    opacity: 0;
    text-align: center;
  }
  .birthday-finale__message {
    width: min(88vw, 44rem);
    min-height: 9rem;
    padding: 1.5rem;
    border: 1px solid rgba(231, 191, 255, 0.38);
    border-radius: 1rem;
    background: rgba(26, 12, 40, 0.46);
    box-shadow: 0 0 48px rgba(177, 87, 255, 0.24);
    color: #fff4ff;
    font: 600 clamp(1.5rem, 6vw, 3.5rem)/1.3 Georgia, serif;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .birthday-finale__message:focus-visible {
    outline: 2px solid #f0caff;
    outline-offset: 5px;
  }
  .birthday-finale__outro-title {
    width: min(90vw, 48rem);
    color: #fff4ff;
    font: 700 clamp(2rem, 8vw, 5rem)/1.2 Georgia, serif;
    text-shadow: 0 0 18px rgba(220, 169, 255, 0.7), 0 0 52px rgba(164, 77, 227, 0.8);
    pointer-events: none;
  }
  @keyframes star-popup-glow {
    from { filter: brightness(0.92); }
    to { filter: brightness(1.18); }
  }
  @keyframes star-popup-text-scroll {
    from { transform: translateY(0); }
    to { transform: translateY(calc(-1 * var(--text-distance))); }
  }
`;
document.head.appendChild(messageStyles);

/* ------------------------------------------------------------------ */
/* Birthday finale                                                     */
/* ------------------------------------------------------------------ */

const BIRTHDAY_MESSAGES = [
  "Happy birthday Shalom❤️",
  "May the Lord bless you abundantly with everything and more",
  "Stay amazing, Mama!",
  "uhhhhh..... beeglejuice😝",
];
let finaleStarted = false;

async function startBirthdayFinale() {
  if (finaleStarted) return;
  finaleStarted = true;

  const finale = document.createElement("div");
  finale.className = "birthday-finale";
  const message = document.createElement("button");
  message.className = "birthday-finale__message";
  message.type = "button";
  message.setAttribute("aria-label", "Continue through the birthday messages");
  const title = document.createElement("div");
  title.className = "birthday-finale__outro-title";
  title.textContent = BIRTHDAY_MESSAGES[0];
  finale.append(message, title);
  document.body.appendChild(finale);

  const lastIndex = BIRTHDAY_MESSAGES.length - 1;
  for (let i = 0; i <= lastIndex; i++) {
    message.textContent = BIRTHDAY_MESSAGES[i];
    await tween(message, { opacity: [0, 1], scale: [0.82, 1], translateY: [28, 0] }, 850, "out(3)");
    if (i === lastIndex) break;

    await new Promise((resolve) => message.addEventListener("click", resolve, { once: true }));
    vibrate();
    await tween(message, { opacity: [1, 0], scale: [1, 0.9], translateY: [0, -14] }, 220, "in(2)");
  }

  await wait(4000);
  await tween(message, { opacity: [1, 0], scale: [1, 0.96] }, 1800, "inOut(2)");
  await tween(title, { opacity: [0, 1] }, 2600, "out(3)");
  await wait(2600);
  await tween(title, { opacity: [1, 0] }, 2200, "inOut(2)");

  window.location.reload();
}

/* ------------------------------------------------------------------ */
/* Star popups                                                         */
/* ------------------------------------------------------------------ */

const POPUP_DISINTEGRATE_DURATION = 3200;
const POPUP_TEXT_SCROLL_DURATION = 5000;
const POPUP_DISINTEGRATE_DELAY = 9000;
const STAR_CLICK_TRIGGER = 11;

// Lazy-loaded: the library (and snapdom) ship as a separate chunk that downloads
// in parallel with the other assets while the loading screen is up.
let messageDisintegrator = null;
const disintegratorReady = import("vanilla-disintegrate/snapdom")
  .then((mod) => {
    const Disintegrator = mod.default;
    const { createParticleEffect, particlePresets } = mod;
    messageDisintegrator = new Disintegrator({
      effect: createParticleEffect({
        remove: {
          particleSize: 4.25,
          alphaThreshold: 0,
          curve: "drift",
          release: "left",
          releaseRandomness: 0.16,
          duration: POPUP_DISINTEGRATE_DURATION,
          stagger: 0,
          fadeStart: 0.59,
          layoutRelease: 0.6,
          horizontalDrift: 23,
          horizontalTravel: [-23, 237],
          verticalTravel: [-43, 14],
          convergence: 0,
          swirl: 48,
          waveTurns: 1.25,
          endScale: 0.82,
          rotation: [0, 0],
        },
        restore: particlePresets.dust,
      }),
      sound: {
        remove: { volume: 0.32, playbackRate: 1, delay: 0, fadeDuration: 0.3, src: "wind", reverse: false },
      },
    });
  })
  .catch((error) => console.warn("Disintegrate effect unavailable, popups will simply fade out.", error));

const starContent = [
  { image: starImage1, text: "This is a story of a star...." },
  { image: starImage6, text: "A wild star like no other!" },
  { image: starImage4, text: "she lights up everywhere she goes" },
  { image: starImage2, text: "today's her star anniversary, a special day ✨" },
  { image: starImage8, text: "a guiding star, leading one twinkle at a time" },
  { image: starImage3, text: "radiant as a flower in bloom, she brings joy to those around her" },
  { image: starImage5, text: "a star that shines in any sky, creating smiles no matter the day" },
  { image: starImage9, text: "surrounded by other stars, she creates an orbit anywhere she goes" },
  { image: starImage11, text: "And somewhere along her journey, she caught another star..." },
  { image: starImage10, text: "they might just rule the sky together someday ⭐❤️" },
  { image: starImage7, text: "until then, may her light continue to shine bright" },
];

// Decode every popup image up front so popups never pop in half-loaded.
const imagesReady = Promise.all(
  starContent.map(({ image }) => {
    const img = new Image();
    img.src = image;
    return img
      .decode()
      .catch(() => {})
      .then(() => {
        loadState.images += 1 / starContent.length;
        updateLoadProgress();
      });
  }),
);

const starCounter = document.createElement("div");
starCounter.className = "star-counter";
starCounter.innerHTML = `
  <div>STARS FOUND <span class="star-counter__value">0</span> / ${STAR_CLICK_TRIGGER}</div>
  <div class="star-counter__trigger">ALL STARS FOUND</div>
`;
document.body.appendChild(starCounter);
const starCounterValue = starCounter.querySelector(".star-counter__value");
const starCounterTrigger = starCounter.querySelector(".star-counter__trigger");

let activeStarPopup = null;
let clickedStarCount = 0;

function disintegrateOrFade(popup) {
  if (messageDisintegrator) {
    messageDisintegrator.remove(popup);
  } else {
    animeAnimate(popup, { opacity: [1, 0], duration: 600, ease: "out(2)" });
  }
}

function showStarMessage(content, onComplete) {
  if (activeStarPopup?.parentNode) disintegrateOrFade(activeStarPopup);

  const popup = document.createElement("div");
  popup.className = "star-popup";
  popup.innerHTML = `
    <div class="star-popup__content">
      <div class="star-popup__media">
        <img class="star-popup__image" src="${content.image}" alt="A captured moment from the night sky" />
      </div>
      <div class="star-popup__text"><div class="star-popup__text-track">${content.text}</div></div>
    </div>
  `;
  document.body.appendChild(popup);
  activeStarPopup = popup;

  const text = popup.querySelector(".star-popup__text");
  const textTrack = popup.querySelector(".star-popup__text-track");

  animeAnimate(popup, { opacity: [0, 1], scale: [0.92, 1], duration: 480, ease: "out(3)" });

  requestAnimationFrame(() => {
    let scrollDuration = 0;
    const overflow = textTrack.scrollHeight - text.clientHeight;
    if (overflow > 0) {
      scrollDuration = POPUP_TEXT_SCROLL_DURATION;
      textTrack.style.setProperty("--text-distance", `${overflow}px`);
      textTrack.style.setProperty("--text-scroll-duration", `${scrollDuration}ms`);
      textTrack.classList.add("is-scrolling");
    }

    const finish = () => {
      popup.remove();
      if (activeStarPopup === popup) activeStarPopup = null;
      onComplete?.();
    };

    window.setTimeout(() => {
      if (!popup.parentNode) return finish();
      disintegrateOrFade(popup);
      window.setTimeout(finish, POPUP_DISINTEGRATE_DURATION);
    }, 480 + scrollDuration + POPUP_DISINTEGRATE_DELAY);
  });
}

/* ------------------------------------------------------------------ */
/* Sky: nebula, stars, moon                                            */
/* ------------------------------------------------------------------ */

const BAND_N = new THREE.Vector3(0.35, 1.0, 0.15).normalize();
const NEBULA_DIR = new THREE.Vector3(0.6, 0.25, -0.75).normalize();
const MOON_DIR = new THREE.Vector3(0.3, 0.55, -0.8).normalize();

const noiseGLSL = `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);
    const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.0-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;
    vec4 s1=floor(b1)*2.0+1.0;
    vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
    m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  float fbm(vec3 p){
    float f=0.0; float a=0.5;
    for(int i=0;i<6;i++){ f+=a*snoise(p); p=p*2.02+vec3(1.7,9.2,3.1); a*=0.5; }
    return f;
  }
`;

const domeVert = `
  varying vec3 vDir;
  void main(){
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFrag = `
  uniform vec3 uBandN;
  uniform vec3 uCore;
  varying vec3 vDir;
  ${noiseGLSL}
  void main(){
    vec3 d = normalize(vDir);
    float b = 1.0 - abs(dot(d, uBandN));
    float band = pow(b, 5.0);
    float core = pow(max(dot(d, uCore), 0.0), 14.0);
    vec3 c2 = normalize(vec3(-0.7, 0.1, 0.5));
    float core2 = pow(max(dot(d, c2), 0.0), 16.0);
    vec3 q = vec3(
      fbm(d*1.8),
      fbm(d*1.8 + vec3(5.2,1.3,2.8)),
      fbm(d*1.8 + vec3(2.1,7.7,4.4))
    );
    float cloud = fbm(d*2.6 + q*1.6) * 0.5 + 0.5;
    float fine = fbm(d*7.0 + q*0.8) * 0.5 + 0.5;
    float mask = clamp(band*0.8 + core*1.1 + core2*0.8, 0.0, 1.6);
    float dens = smoothstep(0.38, 0.9, cloud*0.8 + fine*0.35) * mask;
    float dust = smoothstep(0.5, 0.72, fbm(d*4.5 + q*2.0 + 11.0) * 0.5 + 0.5);
    dens *= 1.0 - dust * 0.75;
    vec3 violet = vec3(0.16, 0.05, 0.30);
    vec3 magenta = vec3(0.78, 0.18, 0.52);
    vec3 teal = vec3(0.10, 0.55, 0.68);
    vec3 amber = vec3(1.00, 0.72, 0.50);
    float hueMix = smoothstep(0.35, 0.75, fbm(d*2.2 + q + 20.0) * 0.5 + 0.5);
    vec3 col = mix(violet, magenta, smoothstep(0.1, 0.6, dens));
    col = mix(col, teal, hueMix * 0.65);
    col += amber * pow(clamp(dens, 0.0, 1.0), 2.5) * (core*0.8 + core2*0.5);
    vec3 sky = vec3(0.006, 0.008, 0.022) + vec3(0.02, 0.018, 0.05) * band;
    vec3 outc = sky + col * dens * 1.1;
    outc += vec3(0.05, 0.03, 0.08) * band * fine * 0.5;
    outc = vec3(1.0) - exp(-outc * 1.5);
    gl_FragColor = vec4(outc, 1.0);
  }
`;

// The nebula is expensive, so it is baked ONCE into a cubemap (smaller on phones).
// The bake itself is deferred to bakeNebula(), which boot() calls after the
// loading bar has had a chance to paint.
const cubeRT = new THREE.WebGLCubeRenderTarget(CUBE_SIZE, {
  format: THREE.RGBAFormat,
  generateMipmaps: true,
  minFilter: THREE.LinearMipmapLinearFilter,
  magFilter: THREE.LinearFilter,
});
const bakeScene = new THREE.Scene();
bakeScene.add(
  new THREE.Mesh(
    new THREE.SphereGeometry(1000, 64, 32),
    new THREE.ShaderMaterial({
      vertexShader: domeVert,
      fragmentShader: nebulaFrag,
      uniforms: { uBandN: { value: BAND_N }, uCore: { value: NEBULA_DIR } },
      side: THREE.BackSide,
      depthWrite: false,
    }),
  ),
);
const bakeNebula = () => new THREE.CubeCamera(0.1, 3000, cubeRT).update(renderer, bakeScene);

const dome = new THREE.Mesh(
  new THREE.SphereGeometry(1000, 48, 24),
  new THREE.ShaderMaterial({
    vertexShader: domeVert,
    fragmentShader: `
      uniform samplerCube uCube;
      uniform float uIntensity;
      varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec3 c = textureCube(uCube, normalize(vDir)).rgb * uIntensity;
        c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    uniforms: { uCube: { value: cubeRT.texture }, uIntensity: { value: 0.65 } },
    side: THREE.BackSide,
    depthWrite: false,
  }),
);
dome.renderOrder = -1;
scene.add(dome);

const starVert = `
  attribute float size;
  attribute float phase;
  attribute vec3 color;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uOpacity;
  uniform float uTwinkle;
  varying vec3 vColor;
  varying float vAlpha;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 1.0 - uTwinkle + uTwinkle * sin(uTime * (0.6 + phase * 2.2) + phase * 50.0);
    gl_PointSize = size * uPixelRatio * (0.85 + 0.2 * tw);
    vColor = color;
    vAlpha = (0.7 + 0.3 * tw) * uOpacity;
  }
`;

const starFrag = `
  varying vec3 vColor;
  varying float vAlpha;
  void main(){
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.0, d);
    float glow = exp(-d * d * 28.0);
    float a = (core * 0.35 + glow) * vAlpha * smoothstep(0.5, 0.4, d);
    gl_FragColor = vec4(vColor, a);
  }
`;

const heroFrag = `
  varying vec3 vColor;
  varying float vAlpha;
  void main(){
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float glow = exp(-d * d * 60.0) + exp(-d * 14.0) * 0.35;
    float spike = (exp(-abs(c.x) * 90.0) * exp(-abs(c.y) * 6.0)
                 + exp(-abs(c.y) * 90.0) * exp(-abs(c.x) * 6.0)) * 0.6;
    float a = (glow + spike) * vAlpha * smoothstep(0.5, 0.35, d);
    gl_FragColor = vec4(vColor, a);
  }
`;

const starPalette = [
  { c: [0.66, 0.77, 1.0], w: 0.14 },
  { c: [0.84, 0.89, 1.0], w: 0.22 },
  { c: [1.0, 1.0, 1.0], w: 0.28 },
  { c: [1.0, 0.95, 0.84], w: 0.18 },
  { c: [1.0, 0.83, 0.63], w: 0.12 },
  { c: [1.0, 0.7, 0.52], w: 0.06 },
];

const pickColor = () => {
  let roll = Math.random();
  for (const palette of starPalette) {
    if ((roll -= palette.w) <= 0) return palette.c;
  }
  return starPalette[2].c;
};

const bandU = new THREE.Vector3(1, 0, 0).cross(BAND_N).normalize();
const bandV = BAND_N.clone().cross(bandU).normalize();

function makeStars(count, radius, dirFn, sizeFn, frag, opacity = 1.0) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const d = dirFn().multiplyScalar(radius);
    positions.set([d.x, d.y, d.z], i * 3);
    colors.set(pickColor(), i * 3);
    sizes[i] = sizeFn();
    phases[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("phase", new THREE.BufferAttribute(phases, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: starVert,
    fragmentShader: frag,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: getDpr() },
      uOpacity: { value: opacity },
      uTwinkle: { value: 0.8 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 2;
  scene.add(points);
  return mat;
}

const bandDir = () => {
  const t = Math.random() * Math.PI * 2;
  return bandU.clone()
    .multiplyScalar(Math.cos(t))
    .addScaledVector(bandV, Math.sin(t))
    .addScaledVector(BAND_N, gauss() * 0.13)
    .normalize();
};

const nearNebula = () =>
  NEBULA_DIR.clone()
    .add(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.28))
    .normalize();

const starMats = [
  makeStars(Math.round(5000 * STAR_SCALE), 600, randDir, () => 1.2 + Math.pow(Math.random(), 6) * 4.5, starFrag),
  makeStars(Math.round(7000 * STAR_SCALE), 600, bandDir, () => 1.0 + Math.pow(Math.random(), 7) * 3.5, starFrag),
  makeStars(Math.round(900 * STAR_SCALE), 600, nearNebula, () => 1.2 + Math.pow(Math.random(), 5) * 3.5, starFrag),
  makeStars(
    46,
    580,
    () => (Math.random() < 0.45 ? nearNebula() : randDir()),
    () => rand(16, 34),
    heroFrag,
    1.15,
  ),
];

const MOON_POSITION = MOON_DIR.clone().multiplyScalar(350);
const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(13, 32, 32),
  new THREE.ShaderMaterial({
    uniforms: { uSunDir: { value: MOON_DIR.clone().negate().normalize() } },
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      void main(){
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      void main(){
        vec3 n = normalize(vNormal);
        float lit = clamp(dot(n, normalize(uSunDir)), 0.0, 1.0);
        vec3 base = vec3(0.96, 0.95, 0.9);
        vec3 shadow = vec3(0.10, 0.12, 0.18);
        float crater = smoothstep(0.78, 1.0, sin(vWorldPos.x * 18.0 + vWorldPos.y * 22.0) * 0.5 + 0.5);
        vec3 color = mix(shadow, base, lit);
        color = mix(color, vec3(0.78, 0.79, 0.84), crater * 0.2);
        float rim = pow(1.0 - max(dot(n, normalize(-vWorldPos)), 0.0), 2.0);
        color += rim * 0.06;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  }),
);
moonMesh.position.copy(MOON_POSITION);
moonMesh.renderOrder = 4;
scene.add(moonMesh);

const glowCanvas = document.createElement("canvas");
glowCanvas.width = glowCanvas.height = 256;
const glowCtx = glowCanvas.getContext("2d");
const glowGrad = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
glowGrad.addColorStop(0.0, "rgba(255,255,255,0.8)");
glowGrad.addColorStop(0.08, "rgba(220,232,255,0.38)");
glowGrad.addColorStop(0.24, "rgba(190,210,255,0.18)");
glowGrad.addColorStop(0.55, "rgba(160,190,255,0.06)");
glowGrad.addColorStop(1.0, "rgba(160,190,255,0.0)");
glowCtx.fillStyle = glowGrad;
glowCtx.fillRect(0, 0, 256, 256);

const moonGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(glowCanvas),
    color: 0xe7f2ff,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
moonGlow.scale.setScalar(60);
moonGlow.position.copy(MOON_POSITION);
moonGlow.renderOrder = 3;
scene.add(moonGlow);

const dwindlingNebula = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: (() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext("2d");
      const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
      grad.addColorStop(0.0, "rgba(255, 185, 220, 0.9)");
      grad.addColorStop(0.2, "rgba(255, 120, 185, 0.6)");
      grad.addColorStop(0.55, "rgba(89, 150, 255, 0.28)");
      grad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(canvas);
    })(),
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
dwindlingNebula.position.copy(NEBULA_DIR.clone().multiplyScalar(350));
dwindlingNebula.scale.set(160, 120, 1);
scene.add(dwindlingNebula);

const milkyWay = new THREE.Mesh(
  new THREE.SphereGeometry(450, 64, 32),
  new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 uBandN;
      void main(){
        vec3 d = normalize(vDir);
        float b = 1.0 - abs(dot(d, uBandN));
        float band = pow(max(b, 0.0), 6.0);
        vec3 warm = vec3(1.0, 0.8, 0.7);
        vec3 cool = vec3(0.7, 0.8, 1.0);
        vec3 col = mix(cool, warm, smoothstep(0.12, 0.8, band));
        float alpha = band * (0.10 + 0.22 * sin(d.y * 30.0));
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
    uniforms: { uBandN: { value: BAND_N } },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
scene.add(milkyWay);

/* ------------------------------------------------------------------ */
/* Ground, grass, lilies                                               */
/* ------------------------------------------------------------------ */

const GROUND_Y = -2;
const groundTex = new THREE.TextureLoader(loadingManager).load(asset("3dassests/grasslight-big.webp"));
groundTex.wrapS = THREE.RepeatWrapping;
groundTex.wrapT = THREE.RepeatWrapping;
groundTex.repeat.set(40, 40);
groundTex.anisotropy = 4;

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 600),
  new THREE.MeshBasicMaterial({ map: groundTex, color: 0x223322, side: THREE.DoubleSide }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = GROUND_Y;
ground.renderOrder = 1;
scene.add(ground);

const GRASS_COUNT = LOW_POWER ? 3500 : 7000;
const GRASS_RADIUS = 70;
const GRASS_HEIGHT_VARIATION = 0.4;
const GRASS_WIND_SPEED = 0.85;
const GRASS_WIND_STRENGTH = 0.28;
const LILY_WIND_SPEED = 0.8;
const LILY_WIND_STRENGTH = 0.9;
const LILY_RADIUS = GRASS_RADIUS - 2;
const grassWindMaterials = [];
const lilyWindMaterials = [];

function makeGrassMaterial(sourceMaterial, modelHeight) {
  const material = new THREE.MeshBasicMaterial({
    color: sourceMaterial.color?.clone() ?? new THREE.Color(0x52783d),
    map: sourceMaterial.map ?? null,
    alphaMap: sourceMaterial.alphaMap ?? null,
    transparent: sourceMaterial.transparent || Boolean(sourceMaterial.alphaMap),
    alphaTest: sourceMaterial.alphaTest || 0.05,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.grassTime = { value: 0 };
    shader.uniforms.grassHeight = { value: modelHeight };
    shader.uniforms.grassWindSpeed = { value: GRASS_WIND_SPEED };
    shader.uniforms.grassWindStrength = { value: GRASS_WIND_STRENGTH };
    material.userData.grassShader = shader;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `
        #include <common>
        uniform float grassTime;
        uniform float grassHeight;
        uniform float grassWindSpeed;
        uniform float grassWindStrength;
      `,
      )
      .replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        vec3 grassWorldOrigin = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float grassPhase = dot(grassWorldOrigin.xz, vec2(0.075, 0.052));
        float grassHeightFraction = clamp(position.y / grassHeight, 0.0, 1.0);
        float grassBend = grassHeightFraction * grassHeightFraction;
        float grassWave = sin(grassTime * grassWindSpeed + grassPhase)
          + 0.35 * sin(grassTime * grassWindSpeed * 0.63 + grassPhase * 1.7);
        transformed.xz += vec2(0.94, 0.34) * grassWave * grassWindStrength * grassBend;
      `,
      );
  };
  material.customProgramCacheKey = () => "instanced-grass-wind-v1";
  grassWindMaterials.push(material);
  return material;
}

function createGrassField(gltf) {
  let source = null;
  gltf.scene.traverse((object) => {
    if (!source && object.isMesh && object.geometry) source = object;
  });
  if (!source) throw new Error("The grass GLB contains no mesh geometry.");

  const geometry = source.geometry.clone();
  geometry.computeBoundingBox();
  const modelMinY = geometry.boundingBox.min.y;
  const modelHeight = Math.max(geometry.boundingBox.max.y - modelMinY, 0.001);
  geometry.translate(0, -modelMinY, 0);
  geometry.computeBoundingSphere();

  const field = new THREE.InstancedMesh(geometry, makeGrassMaterial(source.material, modelHeight), GRASS_COUNT);
  const dummy = new THREE.Object3D();
  const gridSize = Math.ceil(Math.sqrt(GRASS_COUNT));
  const spacing = (GRASS_RADIUS * 2) / gridSize;

  for (let i = 0; i < GRASS_COUNT; i++) {
    const x = -GRASS_RADIUS + ((i % gridSize) + 0.5) * spacing + rand(-spacing * 0.42, spacing * 0.42);
    const z = -GRASS_RADIUS + (Math.floor(i / gridSize) + 0.5) * spacing + rand(-spacing * 0.42, spacing * 0.42);
    dummy.position.set(x, GROUND_Y, z);
    if (x * x + z * z > GRASS_RADIUS * GRASS_RADIUS) dummy.position.multiplyScalar(0.94);
    const scale = rand(0.78, 1.28);
    dummy.rotation.set(0, rand(0, Math.PI * 2), 0);
    dummy.scale.set(scale, scale * rand(1 - GRASS_HEIGHT_VARIATION, 1 + GRASS_HEIGHT_VARIATION), scale);
    dummy.updateMatrix();
    field.setMatrixAt(i, dummy.matrix);
  }
  field.instanceMatrix.needsUpdate = true;
  field.computeBoundingSphere();
  field.renderOrder = 2;
  scene.add(field);
}

function makeLilyMaterial(sourceMaterial, modelHeight, windEnabled) {
  const material = Array.isArray(sourceMaterial) ? sourceMaterial[0] : sourceMaterial;
  const lilyMaterial = new THREE.MeshBasicMaterial({
    color: material?.color?.clone() ?? new THREE.Color(0xffffff),
    map: material?.map ?? null,
    alphaMap: material?.alphaMap ?? null,
    transparent: material?.transparent || Boolean(material?.alphaMap),
    alphaTest: material?.alphaTest || 0.02,
    side: THREE.DoubleSide,
  });
  if (!windEnabled) return lilyMaterial;

  lilyMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.lilyTime = { value: 0 };
    shader.uniforms.lilyHeight = { value: modelHeight };
    shader.uniforms.lilyWindSpeed = { value: LILY_WIND_SPEED };
    shader.uniforms.lilyWindStrength = { value: LILY_WIND_STRENGTH };
    lilyMaterial.userData.lilyShader = shader;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `
        #include <common>
        uniform float lilyTime;
        uniform float lilyHeight;
        uniform float lilyWindSpeed;
        uniform float lilyWindStrength;
      `,
      )
      .replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        vec3 lilyWorldOrigin = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float lilyPhase = dot(lilyWorldOrigin.xz, vec2(0.062, 0.047));
        float lilyHeightFraction = clamp(position.y / lilyHeight, 0.0, 1.0);
        float lilyBend = lilyHeightFraction * lilyHeightFraction;
        float lilyWave = sin(lilyTime * lilyWindSpeed + lilyPhase)
          + 0.25 * sin(lilyTime * lilyWindSpeed * 0.7 + lilyPhase * 1.6);
        transformed.xz += vec2(0.94, 0.34) * lilyWave * lilyWindStrength * lilyBend;
      `,
      );
  };
  lilyMaterial.customProgramCacheKey = () => "instanced-lily-wind-v1";
  lilyWindMaterials.push(lilyMaterial);
  return lilyMaterial;
}

function createLilyField(gltf, count, yOffset, scaleMin, scaleMax, nearChance = 0.45, windEnabled = false) {
  gltf.scene.updateMatrixWorld(true);
  const sourceMeshes = [];
  const modelBounds = new THREE.Box3();
  gltf.scene.traverse((object) => {
    if (!object.isMesh || !object.geometry) return;
    const geometry = object.geometry.clone();
    geometry.morphAttributes = {};
    geometry.morphTargetsRelative = false;
    geometry.applyMatrix4(object.matrixWorld);
    geometry.computeBoundingBox();
    modelBounds.union(geometry.boundingBox);
    sourceMeshes.push({ geometry, material: object.material });
  });
  if (sourceMeshes.length === 0) throw new Error("The water lily GLB contains no mesh geometry.");

  const modelMinY = modelBounds.min.y;
  const modelHeight = Math.max(modelBounds.max.y - modelMinY, 0.001);
  const lilyMeshes = sourceMeshes.map(({ geometry, material }) => {
    geometry.translate(0, -modelMinY, 0);
    geometry.computeBoundingSphere();
    const instanced = new THREE.InstancedMesh(geometry, makeLilyMaterial(material, modelHeight, windEnabled), count);
    instanced.renderOrder = 2;
    scene.add(instanced);
    return instanced;
  });

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const radius = Math.sqrt(Math.random()) * (Math.random() < nearChance ? 20 : LILY_RADIUS);
    dummy.position.set(Math.cos(angle) * radius, GROUND_Y + yOffset, Math.sin(angle) * radius);
    dummy.rotation.set(0, rand(0, Math.PI * 2), 0);
    dummy.scale.setScalar(rand(scaleMin, scaleMax));
    dummy.updateMatrix();
    for (const instanced of lilyMeshes) instanced.setMatrixAt(i, dummy.matrix);
  }
  for (const instanced of lilyMeshes) {
    instanced.instanceMatrix.needsUpdate = true;
    instanced.computeBoundingSphere();
  }
}

// Every GLB goes through the shared loadingManager so the progress bar is accurate.
// The Meshopt decoder is harmless for uncompressed files and required for compressed ones.
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);
const loadModel = (url, onLoad, label) =>
  gltfLoader.load(url, onLoad, undefined, (error) => console.error(`Unable to load the ${label} asset.`, error));

loadModel(asset("3dassests/model.glb"), createGrassField, "tall grass");
loadModel(
  asset("3dassests/water_lily.glb"),
  (gltf) => createLilyField(gltf, LOW_POWER ? 90 : 140, -2.18, 0.1, 0.22, 0.3, true),
  "water lily",
);
loadModel(
  asset("3dassests/origami_-_water_lilies.glb"),
  (gltf) => createLilyField(gltf, 36, 0, 0.1, 0.25, 1),
  "origami water lily",
);

/* ------------------------------------------------------------------ */
/* Fireflies                                                           */
/* ------------------------------------------------------------------ */

const FIREFLY_COUNT = LOW_POWER ? 80 : 125;
const FIREFLY_MIN_RADIUS = 1;
const FIREFLY_RADIUS = 35;
const FIREFLY_MIN_HEIGHT = 0.35;
const FIREFLY_MAX_HEIGHT = 4.0;

const fireflyPositions = new Float32Array(FIREFLY_COUNT * 3);
const fireflyPhases = new Float32Array(FIREFLY_COUNT);
for (let i = 0; i < FIREFLY_COUNT; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = FIREFLY_MIN_RADIUS + Math.sqrt(Math.random()) * (FIREFLY_RADIUS - FIREFLY_MIN_RADIUS);
  fireflyPositions[i * 3] = Math.cos(angle) * radius;
  fireflyPositions[i * 3 + 1] = GROUND_Y + rand(FIREFLY_MIN_HEIGHT, FIREFLY_MAX_HEIGHT);
  fireflyPositions[i * 3 + 2] = Math.sin(angle) * radius;
  fireflyPhases[i] = Math.random() * Math.PI * 2;
}

const fireflyGeo = new THREE.BufferGeometry();
fireflyGeo.setAttribute("position", new THREE.BufferAttribute(fireflyPositions, 3));
fireflyGeo.setAttribute("aPhase", new THREE.BufferAttribute(fireflyPhases, 1));

const fireflyMat = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    driftSpeed: { value: 0.35 },
    driftAmount: { value: 1.4 },
    bobSpeed: { value: 0.6 },
    bobAmount: { value: 0.5 },
    baseSizePx: { value: 7 },
    glowColor: { value: new THREE.Color(0xffd866) },
  },
  vertexShader: `
    attribute float aPhase;
    uniform float time;
    uniform float driftSpeed;
    uniform float driftAmount;
    uniform float bobSpeed;
    uniform float bobAmount;
    uniform float baseSizePx;
    varying float vBrightness;

    void main() {
      vec3 pos = position;
      pos.x += sin(time * driftSpeed + aPhase) * driftAmount;
      pos.z += cos(time * driftSpeed * 0.7 + aPhase * 1.7) * driftAmount;
      pos.y += sin(time * bobSpeed + aPhase * 2.3) * bobAmount;

      float flicker = 0.55
        + sin(time * 1.7 + aPhase) * 0.3
        + sin(time * 4.1 + aPhase * 3.0) * 0.15;
      vBrightness = clamp(flicker, 0.05, 1.0);

      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPos;
      gl_PointSize = clamp(baseSizePx * (60.0 / -mvPos.z) * (0.6 + vBrightness * 0.4), 1.0, 16.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform vec3 glowColor;
    varying float vBrightness;
    void main() {
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      float core = smoothstep(0.3, 0.0, dist);
      float glow = exp(-dist * dist / 0.05) * 0.7;
      float alpha = (core + glow) * vBrightness;
      gl_FragColor = vec4(glowColor, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
fireflies.frustumCulled = false;
fireflies.renderOrder = 3;
scene.add(fireflies);

/* ------------------------------------------------------------------ */
/* Shooting stars                                                      */
/* ------------------------------------------------------------------ */

const shootingStarHeadTex = (() => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0.0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.15, "rgba(222,236,255,0.80)");
  g.addColorStop(0.45, "rgba(182,212,255,0.25)");
  g.addColorStop(1.0, "rgba(160,200,255,0.00)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
})();

const SHOOTING_STAR_COUNT = 6;
const SHOOTING_STAR_SKY_RADIUS = 390;
const SHOOTING_STAR_FLIGHT_DURATION = 2.8;
const SHOOTING_STAR_TRAIL_T = 0.12;
const SHOOTING_STAR_HEAD_SIZE = 10;
const SHOOTING_STAR_CYCLE_MIN = 0.5;
const SHOOTING_STAR_CYCLE_MAX = 0.6;
const SHOOTING_STAR_TAP_RADIUS_PX = 60;
const SHOOTING_STAR_BURST_DURATION = 0.45;
const SHOOTING_STAR_BURST_SCALE_MULT = 1.7;

const nextCycleDelay = () => rand(SHOOTING_STAR_CYCLE_MIN, SHOOTING_STAR_CYCLE_MAX);

function randomSkyPoint(radius) {
  let v;
  do {
    v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  } while (v.lengthSq() > 1 || v.lengthSq() < 0.0001);
  v.normalize();
  if (v.y < 0.1) v.y = 0.1 + Math.random() * 0.35;
  return v.normalize().multiplyScalar(radius);
}

function buildShootingStarPath() {
  const start = randomSkyPoint(SHOOTING_STAR_SKY_RADIUS);
  const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
  const angle = THREE.MathUtils.degToRad(45 + Math.random() * 35);
  return { start, end: start.clone().applyAxisAngle(axis, angle) };
}

const shootingStarPathPoint = (path, t) =>
  path.start.clone().lerp(path.end, t).normalize().multiplyScalar(SHOOTING_STAR_SKY_RADIUS);

const shootingStars = [];
for (let i = 0; i < SHOOTING_STAR_COUNT; i++) {
  const lineGeo = new THREE.BufferGeometry();
  const linePositions = new THREE.BufferAttribute(new Float32Array(6), 3);
  linePositions.setUsage(THREE.DynamicDrawUsage);
  lineGeo.setAttribute("position", linePositions);
  const line = new THREE.Line(
    lineGeo,
    new THREE.LineBasicMaterial({
      color: 0xcfe6ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  line.frustumCulled = false;
  line.visible = false;
  line.renderOrder = 3;
  scene.add(line);

  const head = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: shootingStarHeadTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  head.scale.setScalar(SHOOTING_STAR_HEAD_SIZE);
  head.visible = false;
  head.renderOrder = 3;
  scene.add(head);

  shootingStars.push({
    state: "waiting",
    timer: Math.random() * SHOOTING_STAR_CYCLE_MAX,
    t: 0,
    path: null,
    line,
    head,
    currentHeadPos: null,
  });
}

function resetShootingStar(star) {
  star.state = "waiting";
  star.timer = nextCycleDelay();
  star.line.visible = false;
  star.head.visible = false;
  star.currentHeadPos = null;
}

function updateShootingStars(dt) {
  for (const star of shootingStars) {
    if (star.state === "waiting") {
      star.timer -= dt;
      if (star.timer <= 0) {
        star.state = "flying";
        star.t = 0;
        star.path = buildShootingStarPath();
        star.line.visible = true;
        star.head.visible = true;
      }
      continue;
    }

    star.t += dt / SHOOTING_STAR_FLIGHT_DURATION;
    if (star.t >= 1) {
      resetShootingStar(star);
      continue;
    }

    const headPos = shootingStarPathPoint(star.path, star.t);
    const tailPos = shootingStarPathPoint(star.path, Math.max(0, star.t - SHOOTING_STAR_TRAIL_T));
    const brightness = Math.sin(star.t * Math.PI);

    const posAttr = star.line.geometry.attributes.position;
    posAttr.setXYZ(0, tailPos.x, tailPos.y, tailPos.z);
    posAttr.setXYZ(1, headPos.x, headPos.y, headPos.z);
    posAttr.needsUpdate = true;
    star.line.material.opacity = brightness * 0.85;

    star.head.position.copy(headPos);
    star.head.material.opacity = brightness;
    star.head.scale.setScalar(SHOOTING_STAR_HEAD_SIZE * (0.7 + brightness * 0.5));

    star.currentHeadPos = headPos;
  }
}

const activeBursts = [];
function spawnBurst(position) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: shootingStarHeadTex,
      color: 0xeaf3ff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  sprite.position.copy(position);
  sprite.scale.setScalar(SHOOTING_STAR_HEAD_SIZE);
  sprite.renderOrder = 4;
  scene.add(sprite);
  activeBursts.push({ sprite, age: 0 });
}

function updateBursts(dt) {
  for (let i = activeBursts.length - 1; i >= 0; i--) {
    const burst = activeBursts[i];
    burst.age += dt;
    const t = Math.min(burst.age / SHOOTING_STAR_BURST_DURATION, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    burst.sprite.scale.setScalar(SHOOTING_STAR_HEAD_SIZE * (1 + SHOOTING_STAR_BURST_SCALE_MULT * eased));
    burst.sprite.material.opacity = 0.85 * (1 - t);
    if (t >= 1) {
      scene.remove(burst.sprite);
      burst.sprite.material.dispose();
      activeBursts.splice(i, 1);
    }
  }
}

const _screenProjectVec = new THREE.Vector3();
function worldToScreenPx(worldPos) {
  _screenProjectVec.copy(worldPos).project(camera);
  return {
    x: (_screenProjectVec.x * 0.5 + 0.5) * window.innerWidth,
    y: (-_screenProjectVec.y * 0.5 + 0.5) * window.innerHeight,
    behindCamera: _screenProjectVec.z > 1,
  };
}

function handleShootingStarTap(px, py) {
  if (clickedStarCount >= STAR_CLICK_TRIGGER) return;

  let closest = null;
  let closestDist = SHOOTING_STAR_TAP_RADIUS_PX;
  for (const star of shootingStars) {
    if (star.state !== "flying" || !star.currentHeadPos) continue;
    const screen = worldToScreenPx(star.currentHeadPos);
    if (screen.behindCamera) continue;
    const dist = Math.hypot(screen.x - px, screen.y - py);
    if (dist < closestDist) {
      closestDist = dist;
      closest = star;
    }
  }
  if (!closest) return;

  vibrate();
  spawnBurst(closest.currentHeadPos.clone());
  const content = starContent[clickedStarCount % starContent.length];
  clickedStarCount += 1;
  starCounterValue.textContent = String(clickedStarCount);
  const isLast = clickedStarCount >= STAR_CLICK_TRIGGER;
  if (isLast) starCounterTrigger.classList.add("is-visible");

  resetShootingStar(closest);
  showStarMessage(content, isLast ? startBirthdayFinale : undefined);
}

/* ------------------------------------------------------------------ */
/* Constellations                                                      */
/* ------------------------------------------------------------------ */

const CONSTELLATION_STAR_SIZE_SCALE = 1 / 3;
const CONSTELLATION_STAR_OPACITY = 0.95 * 0.6;
const CONSTELLATION_LINE_COLOR = 0x4a6a9e;
const CONSTELLATION_LINE_OPACITY = 0.6 * 0.6;

function createConstellation(direction, distance, stars, lines) {
  const anchor = new THREE.Object3D();
  anchor.position.copy(direction.clone().normalize().multiplyScalar(distance));
  anchor.lookAt(0, 0, 0);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(anchor.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(anchor.quaternion);

  const positions = {};
  for (const star of stars) {
    const pos = anchor.position.clone()
      .add(right.clone().multiplyScalar(star.x))
      .add(up.clone().multiplyScalar(star.y));
    positions[star.id] = pos;

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: shootingStarHeadTex,
        color: 0xffffff,
        transparent: true,
        opacity: CONSTELLATION_STAR_OPACITY,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    sprite.scale.setScalar(star.size * CONSTELLATION_STAR_SIZE_SCALE);
    sprite.position.copy(pos);
    sprite.renderOrder = 2;
    scene.add(sprite);
  }

  const linePoints = [];
  for (const [a, b] of lines) linePoints.push(positions[a], positions[b]);
  const lineSegments = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(linePoints),
    new THREE.LineBasicMaterial({
      color: CONSTELLATION_LINE_COLOR,
      transparent: true,
      opacity: CONSTELLATION_LINE_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  lineSegments.renderOrder = 2;
  scene.add(lineSegments);
}

const LIBRA_DIR = new THREE.Vector3(0.15, 0.3, 1).normalize();
createConstellation(
  LIBRA_DIR,
  380,
  [
    { id: "zubenelgenubi", x: -36, y: -12, size: 17 },
    { id: "zubeneschamali", x: 28, y: 20, size: 19 },
    { id: "brachium", x: 52, y: -28, size: 12 },
    { id: "sigma", x: -8, y: 40, size: 13 },
  ],
  [
    ["zubenelgenubi", "zubeneschamali"],
    ["zubeneschamali", "brachium"],
    ["zubeneschamali", "sigma"],
  ],
);

createConstellation(
  LIBRA_DIR.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(40)),
  380,
  [
    { id: "kausBorealis", x: 0, y: 44, size: 13 },
    { id: "phi", x: 16, y: 36, size: 12 },
    { id: "nunki", x: 32, y: 20, size: 17 },
    { id: "tau", x: 40, y: -8, size: 12 },
    { id: "ascella", x: 28, y: -32, size: 15 },
    { id: "kausAustralis", x: -20, y: -40, size: 20 },
    { id: "kausMedia", x: -28, y: 28, size: 15 },
    { id: "alnasl", x: -52, y: 12, size: 12 },
  ],
  [
    ["kausBorealis", "phi"],
    ["phi", "nunki"],
    ["nunki", "tau"],
    ["tau", "ascella"],
    ["ascella", "kausAustralis"],
    ["kausAustralis", "kausMedia"],
    ["kausMedia", "kausBorealis"],
    ["kausAustralis", "alnasl"],
  ],
);

/* ------------------------------------------------------------------ */
/* Camera look + input (pointer events only)                           */
/* ------------------------------------------------------------------ */

const INITIAL_PITCH = 0.12;
const LOOK_SENSITIVITY = 0.0035;
const MAX_PITCH = Math.PI / 2 - 0.05;
const TAP_MOVE_THRESHOLD_PX = 8;
const TAP_MAX_DURATION_MS = 500;

let targetYaw = 0;
let targetPitch = INITIAL_PITCH;
let currentYaw = 0;
let currentPitch = INITIAL_PITCH;
let isDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let tapAnchorX = 0;
let tapAnchorY = 0;
let tapStartTime = 0;

function updateCameraLook() {
  currentYaw = THREE.MathUtils.lerp(currentYaw, targetYaw, 0.12);
  currentPitch = THREE.MathUtils.lerp(currentPitch, targetPitch, 0.12);
  camera.rotation.set(currentPitch, currentYaw, 0);
}

renderer.domElement.addEventListener("pointerdown", ({ clientX, clientY }) => {
  isDragging = true;
  lastPointerX = tapAnchorX = clientX;
  lastPointerY = tapAnchorY = clientY;
  tapStartTime = performance.now();
});

window.addEventListener("pointermove", ({ clientX, clientY }) => {
  if (!isDragging) return;
  targetYaw -= (clientX - lastPointerX) * LOOK_SENSITIVITY;
  targetPitch = clamp(targetPitch - (clientY - lastPointerY) * LOOK_SENSITIVITY, -MAX_PITCH, MAX_PITCH);
  lastPointerX = clientX;
  lastPointerY = clientY;
});

window.addEventListener("pointerup", ({ clientX, clientY }) => {
  if (!isDragging) return;
  isDragging = false;
  const moved = Math.hypot(clientX - tapAnchorX, clientY - tapAnchorY) > TAP_MOVE_THRESHOLD_PX;
  if (!moved && performance.now() - tapStartTime <= TAP_MAX_DURATION_MS) {
    handleShootingStarTap(clientX, clientY);
  }
});

window.addEventListener("pointercancel", () => {
  isDragging = false;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(getDpr());
});

/* ------------------------------------------------------------------ */
/* Render loop                                                         */
/* ------------------------------------------------------------------ */

let lastFrameTime = 0;

function animate() {
  requestAnimationFrame(animate);
  if (document.hidden) return; // don't burn battery in background tabs

  const elapsed = performance.now() * 0.001;
  const dt = Math.min(elapsed - lastFrameTime, 0.1);
  lastFrameTime = elapsed;

  updateCameraLook();
  updateShootingStars(dt);
  updateBursts(dt);

  for (const mat of starMats) mat.uniforms.uTime.value = elapsed;
  for (const material of grassWindMaterials) {
    const shader = material.userData.grassShader;
    if (shader) shader.uniforms.grassTime.value = elapsed;
  }
  for (const material of lilyWindMaterials) {
    const shader = material.userData.lilyShader;
    if (shader) shader.uniforms.lilyTime.value = elapsed;
  }
  fireflyMat.uniforms.time.value = elapsed;

  moonGlow.material.opacity = 0.7 + Math.sin(elapsed * 0.8) * 0.12;
  dwindlingNebula.material.opacity = 0.26 + Math.sin(elapsed * 0.7) * 0.05;
  moonMesh.position.y = MOON_POSITION.y + Math.sin(elapsed * 0.5) * 0.04;
  moonMesh.rotation.y = elapsed * 0.08;
  moonGlow.position.copy(moonMesh.position);

  renderer.render(scene, camera);
}

/* ------------------------------------------------------------------ */
/* Startup sequence                                                    */
/* ------------------------------------------------------------------ */

const nextPaint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

(async function boot() {
  await Promise.all([assetsReady, imagesReady, audioReady, disintegratorReady]);

  loaderLabel.firstChild.textContent = "PAINTING THE SKY… ";
  await nextPaint(); // let the bar render before the heavy GPU work
  bakeNebula();
  renderer.compile(scene, camera); // pre-compile shaders so there's no hitch on the first frame
  loadState.sky = 1;
  updateLoadProgress();

  loaderLabel.textContent = "READY";
  loaderEnter.style.display = "block";
  await new Promise((r) => loaderEnter.addEventListener("click", r, { once: true }));

  backgroundMusic.play().catch(() => {}); // user gesture, so audio is allowed
  animate();
  loader.classList.add("is-hidden");
  window.setTimeout(() => loader.remove(), 1000);
})();
