const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const cepolyfill = fs.readFileSync('../../components/custom-elements/custom-elements.min.js');
const polymer = fs.readFileSync('../../components/polymer/build/default/polymer-element.js');

  // window.customElements = {
  //   _registry: new Map(),
  //   _names: new Map(),
  //   define(name, cls) {
  //     this._registry.set(name, cls);
  //     this._names.set(cls, name);
  //   },
  //   get(name) {
  //     return this._registry.get(name);
  //   }
  // }

  // let NativeHTMLElement = window.HTMLElement;
  // window.HTMLElement = function() {
  //   let name = customElements._names.get(this.constructor);
  //   let el = document.createElement(name);
  //   Object.setPrototypeOf(el, this.constructor.prototype);
  //   return el;
  // }
  // window.HTMLElement.prototype = NativeHTMLElement.prototype;

function stubs() {
  window.MutationObserver = class {
    constructor(cb) {
      this.cb = cb;
      this._nodeMap = new Map();
    }
    observe(node) {
      this._nodeMap.set(node, setTimeout(_ => this.cb([])));
    }
    disconnect(node) {
      clearTimeout(this._nodeMap.get(node));
    }
  }
  window.requestAnimationFrame = window.setTimeout;
  window.cancelAnimationFrame = window.clearTimeout;
  window.HTMLElement.prototype.attachShadow = function() {
    this.shadowRoot = document.createElement('s-r');
    this.appendChild(this.shadowRoot);
  }
}

function userScript() {

  class XFoo extends Polymer.Element {
    static get template() { return `
      <div>[[yo]]</div>
    `};
    constructor() {
      super();
      this.yo = 'yo';
    }
  }

  customElements.define('x-foo', XFoo);

  let xfoo = new XFoo();
  document.body.appendChild(xfoo);

  // xfoo.connectedCallback();

  setTimeout(_ => console.log(xfoo.outerHTML), 1000);
}

const dom = new JSDOM(`
  <script>(${stubs})()</script>
  <script>${cepolyfill}</script>
  <script>${polymer}</script>
  <script>(${userScript})()</script>
`, {
    runScripts: "dangerously"
});
