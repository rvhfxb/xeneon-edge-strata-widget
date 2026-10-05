# Third-party notices

Strata Edge is an independent community widget by rvhfxb. It is not an official Strata or CORSAIR product.

## Strata v0.1.39

Monitor rendering adapted from `serve/web/app.js`; design tokens, components, font declarations and inline SVG icons derived from the Strata Web UI.

CSS is pinned to commit `6f32ec070f23ced9f50e704d854d775da52591ab` (v0.1.39). The only tokens.css substitutions are the two font URLs from `../fonts/` to `resources/fonts/`; components.css matches upstream. Source hash records are in the development repository's `upstream-assets.json`.

Copyright (c) 2026 Niko1221 and the Strata contributors. MIT license.
Full notice: `widget/resources/STRATA-LICENSE.txt`.

The Monitor's Decode/Prefill calculations, 60-second sample graphs and treatment of idle/missing samples are retained. The widget adds a fixed 32:9 layout, local helper polling and iCUE theme integration.

## Outfit

Copyright 2021 The Outfit Project Authors (https://github.com/Outfitio/Outfit-Fonts).
SIL Open Font License 1.1. Bundled WOFF2 fonts are in `widget/resources/fonts/`.
Full notice: `widget/resources/fonts/OFL.txt`.

## Runtime and build tools

Node.js and iCUE are required separately and are not bundled. The CORSAIR icuewidget-cli 0.4.47 is used to build the widget and is not included in the release ZIP.
