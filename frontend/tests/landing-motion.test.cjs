const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const filename = path.join(__dirname, "../lib/landing-motion.ts");
const source = fs.readFileSync(filename, "utf8");
const mod = new Module(filename, module);
mod._compile(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  filename,
);
const { setupLandingMotion } = mod.exports;

function fixture(t, { reduced = false, width = 1440 } = {}) {
  const observers = [];
  const documentListeners = new Map();
  const windowListeners = new Map();
  const preferenceListeners = new Map();
  const media = {
    matches: reduced,
    addEventListener: (name, fn) => preferenceListeners.set(name, fn),
    removeEventListener: (name) => preferenceListeners.delete(name),
  };
  const makeTarget = (top) => ({
    dataset: {},
    calls: [],
    getBoundingClientRect: () => ({ top }),
    animate(frames, options) {
      const animation = {
        cancelled: false,
        cancel() {
          this.cancelled = true;
          this.oncancel?.();
        },
      };
      this.calls.push({ frames, options, animation });
      return animation;
    },
  });
  const visible = makeTarget(100);
  const below = makeTarget(1200);
  const section = { dataset: { landingSection: "practice" } };
  const link = {
    hash: "#practice",
    attributes: {},
    setAttribute(k, v) {
      this.attributes[k] = v;
    },
    removeAttribute(k) {
      delete this.attributes[k];
    },
  };
  const document = {
    visibilityState: "visible",
    defaultView: {
      innerHeight: 800,
      innerWidth: width,
      matchMedia: () => media,
      addEventListener: (name, fn) => windowListeners.set(name, fn),
      removeEventListener: (name) => windowListeners.delete(name),
    },
    querySelectorAll: () => [link],
    addEventListener: (name, fn) => documentListeners.set(name, fn),
    removeEventListener: (name) => documentListeners.delete(name),
  };
  const root = {
    ownerDocument: document,
    isConnected: true,
    animate() {},
    querySelectorAll: (selector) =>
      selector === "[data-landing-section]" ? [section] : [visible, below],
  };
  const previous = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.targets = new Set();
      observers.push(this);
    }
    observe(target) {
      this.targets.add(target);
    }
    unobserve(target) {
      this.targets.delete(target);
    }
    disconnect() {
      this.targets.clear();
      this.disconnected = true;
    }
    enter(...targets) {
      this.callback(
        targets.map((target) => ({ target, isIntersecting: true })),
        this,
      );
    }
  };
  t.after(() => {
    if (previous === undefined) delete globalThis.IntersectionObserver;
    else globalThis.IntersectionObserver = previous;
  });
  const cleanup = setupLandingMotion(root);
  t.after(cleanup);
  return {
    root,
    document,
    media,
    link,
    section,
    visible,
    below,
    observers,
    documentListeners,
    windowListeners,
    preferenceListeners,
    cleanup,
  };
}

test("visible content is untouched; below-fold content animates once and releases its observer", (t) => {
  const f = fixture(t);
  assert.equal(f.visible.calls.length, 0);
  assert.equal(f.observers[1].targets.has(f.visible), false);
  assert.equal(f.observers[1].targets.has(f.below), true);
  f.observers[1].enter(f.below, f.below);
  assert.equal(f.below.calls.length, 1);
  assert.equal(f.observers[1].targets.has(f.below), false);
  const { frames, options } = f.below.calls[0];
  assert.equal(options.fill, "backwards");
  assert.ok(options.duration + options.delay < 800);
  assert.deepEqual(Object.keys(frames[0]).sort(), ["opacity", "transform"]);
});

test("reduced motion disables reveals without disabling section navigation", (t) => {
  const f = fixture(t, { reduced: true });
  assert.equal(f.observers.length, 1);
  f.observers[0].enter(f.section);
  assert.equal(f.link.attributes["aria-current"], "location");
  assert.equal(f.below.calls.length, 0);
});

test("changing motion preference cancels in-flight animation without replaying seen content", (t) => {
  const f = fixture(t);
  f.observers[1].enter(f.below);
  f.media.matches = true;
  f.preferenceListeners.get("change")();
  assert.equal(f.below.calls[0].animation.cancelled, true);
  assert.equal(f.observers[1].disconnected, true);
  f.media.matches = false;
  f.preferenceListeners.get("change")();
  assert.equal(f.observers.at(-1).targets.has(f.below), false);
});

test("hidden tabs settle animations and unmount cleans every listener and observer", (t) => {
  const f = fixture(t);
  f.observers[1].enter(f.below);
  f.document.visibilityState = "hidden";
  f.documentListeners.get("visibilitychange")();
  assert.equal(f.below.calls[0].animation.cancelled, true);
  f.cleanup();
  assert.equal(
    f.documentListeners.size +
      f.windowListeners.size +
      f.preferenceListeners.size,
    0,
  );
  assert.ok(f.observers.every((observer) => observer.disconnected));
});

test("section tracking uses viewport-height pixels and recalculates after resizing", (t) => {
  const f = fixture(t);
  assert.equal(f.observers[0].options.rootMargin, "-200px 0px -599px 0px");
  f.document.defaultView.innerHeight = 500;
  f.windowListeners.get("resize")();
  assert.equal(f.observers.at(-1).options.rootMargin, "-125px 0px -374px 0px");
  assert.equal(f.observers[0].disconnected, true);
});

test("section tracking selects the incoming section at a shared boundary", (t) => {
  const f = fixture(t);
  f.observers[0].enter({ dataset: { landingSection: "home" } }, f.section);
  assert.equal(f.link.attributes["aria-current"], "location");
  f.observers[0].enter({ dataset: { landingSection: "pricing" } });
  assert.equal(f.link.attributes["aria-current"], undefined);
});

test("mobile reveals are shorter and no polling or animation frame loop is installed", (t) => {
  const f = fixture(t, { width: 390 });
  f.observers[1].enter(f.below);
  assert.equal(f.below.calls[0].options.duration, 420);
  assert.equal(f.windowListeners.has("scroll"), false);
  assert.doesNotMatch(source, /requestAnimationFrame|setInterval|setTimeout/);
});
