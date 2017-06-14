const ssrify = require('./ssr.js');
require('../../components/polymer/build/default/polymer-element.js');

class XBar extends Polymer.Element {
  static get template() { return `
    <style>
      :host {
        display: inline-block;
        background: lightblue;
        border: 1px solid blue;
        padding: 10px;
      }
    </style>
    <div>[[hi]]</div>
  `};
  constructor() {
    super();
    this.hi = 'hi';
  }
}
customElements.define('x-bar', XBar);

class XFoo extends Polymer.Element {
  static get template() { return `
    <style>
      :host {
        display: inline-block;
        background: pink;
        border: 1px solid red;
        padding: 10px;
      }
    </style>
    <x-bar bar$="[[yo]]"></x-bar>
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
console.log(ssrify(xfoo));
