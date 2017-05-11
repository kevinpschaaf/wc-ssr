# wc-ssr

Explorations in server-side rendering web components.

When `ssr.js` is injected in a page built with shadow-dom, it clones that live document, replaces all
`shadowRoots` with `<shadow-root>`, replaces styles in shadowRoots with placeholder `<shadow-style>` elements keyed to
a master deduped shadow-styles list that's put in a template in head, and injects the `<shadow-root>` element definition.
For now it also removes all imports/scripts so it's just a static page (this exploration does not cover re-inflating/mounting the custom elements, only static rendering for first paint).  The script will open a new tab with the source of the
cloned ssr-ified document.


e.g. open https://shop.polymer-project.org/, then paste this in the console:

```js
var s = document.createElement('script');
s.src = 'https://polygit2.appspot.com/wc-ssr+kevinpschaaf+:master/components/wc-ssr/ssr.js';
s.onload = function() { window.ssrify(true); };
document.head.appendChild(s);
```

Then check out `view-source` of the newly opened tab (look for blocked popup) to see the declarative `<shadow-roots>` in the source, and in the elements panel you should see real `#shadow-root`s.
