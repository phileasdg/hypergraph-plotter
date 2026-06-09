# Hypergraph Plotter JavaScript Library Documentation

`HypergraphPlotter` is a standalone, client-side JavaScript library that computes force-directed spring layouts and renders mathematical hypergraphs as modular SVG layers. 

It is designed to be highly configurable, zero-dependency, and lightweight, making it easy to embed custom interactive hypergraphs on academic blogs, portfolio sites, and web applications.

---

## 1. Quickstart

### Installation

Install the package via npm:

```bash
npm install hypergraph-plotter
```

### Import & Usage

If you are using a build tool or bundler (such as Vite, Webpack, or Rollup):

```javascript
import { HypergraphPlotter } from 'hypergraph-plotter';
```

For direct browser usage, you can import it from a CDN (like [esm.sh](https://esm.sh)):

```javascript
import { HypergraphPlotter } from 'https://esm.sh/hypergraph-plotter';
```

Or reference a local copy of `hypergraph-plotter.js` inside your project as shown below:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Embed Hypergraph</title>
  <style>
    #canvas-container {
      width: 600px;
      height: 400px;
      border: 1px solid #e9ecef;
      background: #ffffff;
    }
  </style>
</head>
<body>

  <!-- Element container to mount the plotter -->
  <div id="canvas-container"></div>

  <script type="module">
    import { HypergraphPlotter } from './hypergraph-plotter.js';

    // 1. Instantiate the plotter on a container
    const plotter = new HypergraphPlotter('#canvas-container', {
      layoutType: 'spring-embedding',
      plotTheme: 'name-labeled',
      edgePalette: 'warm-sunset',
      showGrid: true
    });

    // 2. Load graph data (vertices & hyperedges)
    plotter.setData({
      vertices: [
        { id: 'A', label: 'Vertex A' },
        { id: 'B', label: 'Vertex B' },
        { id: 'C', label: 'Vertex C' },
        { id: 'D', label: 'Vertex D' }
      ],
      hyperedges: [
        { id: 1, vertices: ['A', 'B', 'C'] },
        { id: 2, vertices: ['C', 'D'] }
      ]
    });
  </script>
</body>
</html>
```

```

---

## 2. HTML IFrame Embedding (No-Code)

You can embed any pre-configured hypergraph dynamically onto blogs or websites using a standard `<iframe>` pointing to the visualizer URL with custom query parameters.

### Example Embed

```html
<iframe src="https://phileasdg.github.io/hypergraph-plotter/?embed=true&camera=fixed&nodes=fixed#state=eyJ2ZXJ0aWNlcyI6W3siaWQiOiIxIiwibGFiZWwiOiIxIiwieCI6NzMyLjAyLCJ5Ijo1NjY0M30seyJpZCI6IjIiLCJsYWJlbCI6IjIiLCJ4Ijo3OTAuMTcsInkiOjYxOS44M30seyJpZCI6IjMiLCJsYWJlbCI6IjMiLCJ4Ijo3MjMuMzIsInkiOjY2OS51fHsiaWQiOiI0IiwibGFiZWwiOiI0IiwieCI6Njk1LjY2LCJ5Ijo3NTB9LHsiaWQiOiI1IiwibGFiZWwiOiI1IiwieCI6NjM2LjI5LCJ5Ijo2OTUuNTR9LHsiaWQiOiI2IiwibGFiZWwiOiI2IiwieCI6NTU0LjM1LCJ5Ijo2NzkuNTJ9LHsiaWQiOiI3IiwibGFiZWwiOiI3IiwieCI6NTk1LjgsInkiOjYwOS45MX0seyJpZCI6IjgiLCJsYWJlbCI6IjgiLCJ4Ijo1NzMuMzgsInkiOjUzNC44OH0seyJpZCI6IjkiLCJsYWJlbCI6IjkiLCJ4Ijo2NTIuMzksInkiOjUyOS43fHsiaWQiOiIxMCIsImxhYmVsIjoiMTAiLCJ4Ijo3MTguNSwieSI6NDc5Ljc5fSx7ImlkIjoiMTEiLCJsYWJlbCI6IjExIiwieCI6NDIzLjE1LCJ5Ijo1MDMuMTd9LHsiaWQiOiIxMiIsImxhYmVsIjoiMTIiLCJ4Ijo1MDMuNjksInkiOjQ4Mi4zfSx7ImlkIjoiMTMiLCJsYWJlbCI6IjEzIiwieCI6NDg3LjIyLCJ5Ijo1NTcuNjd9LHsiaWQiOiIxNCIsImxhYmVsIjoiMTQiLCJ4Ijo0NjkuNDcsInkiOjY0Ny41NX0seyJpZCI6IjE1IiwibGFiZWwiOiIxNSIsIngiOjQ3MC42NCwieSI6NzI4Ljg2fSx7ImlkIjoiMTYiLCJsYWJlbCI6IjE2IiwieCI6MzkyLjA4LCJ5Ijo2OTQuNTF9LHsiaWQiOiIxNyIsImxhYmVsIjoiMTciLCJ4IjozMjAuNTMsInkiOjYzNS40Nn0seyJpZCI6IjE4IiwibGFiZWwiOiIxOCIsIngiOjI2Ni40LCJ5Ijo1NzEuNDR9LHsiaWQiOiIxOSIsImxhYmVsIjoiMTkiLCJ4IjozMzkuMzQsInkiOjuNTBMfHsiaWQiOiIyMSIsImxhYmVsIjoiMjEiLCJ4Ijo2NzkuNzgsInkiOjY2LjQ4fSx7ImlkIjoiMjIiLCJsYWJlbCI6IjIyIiwieCI6MjgxLjU1LCJ5IjoxNzYuNDd9LHsiaWQiOiIyMyIsImxhYmVsIjoiMjMiLCJ4IjozMzIuMzUsInkiOjEzNC40MX0seyJpZCI6IjI0IiwibGFiZWwiOiIyNCIsIngiOjQwMC4yNiwInkiOjI2My4yMX0seyJpZCI6IjI1IiwibGFiZWwiOiIyNSIsIngiOjQzMC4wMiwieSI6MTk1Ljg1fSx7ImlkIjoiMjYiLCJsYWJlbCI6IjI2IiwieCI6MzYwLjkzLCJ5IjoyMTUuODR9LHsiaWQiOiIyNyIsImxhYmVsIjoiMjciLCJ4Ijo1MjEuMDgsInkiOjMwOS40OH0seyJpZCI6IjIyIiwibGFiZWwiOiIyOCIsIngiOjg0LjQyLCJ5IjoyNjEuMjF9LHsiaWQiOiIyOSIsImxhYmVsIjoiMjkiLCJ4Ijo1MzQuODgsInkiOjIyMi4zNn0seyJpZCI6IjMwIiwibGFiZWwiOiIzMCIsIngiOjU3Mi45IsInkiOjI3Ni4yN30seyJpZCI6IjMxIiwibGFiZWwiOiIzMSIsIngiOjQ0NC42MSwieSI6NDIyLjM2fSx7ImlkIjoiMzIiLCJsYWJlbCI6IjMyIiwieCI6Mzg1LjQ3LCJ5IjotdDEyLjM0fSx7ImlkIjoiMzMiLCJsYWJlbCI6IjMzIiwieCI6NDQxLjI0LCJ5IjozMzMuODd9LHsiaWQiOiMzNCIsImxhYmVsIjoiMzQiLCJ4Ijo0NzcuMDgsInkiOjM3Ny42M30seyJpZCI6IjM1IiwibGFiZWwiOiMzNSIsIngiOjM4NS45MywieSI6MzUwLjM4fSx7ImlkIjoiMzYiLCJsYWJlbCI6IjM2IiwieCI6NjU5LjM0LCJ5IjozOTEuMjl9LHsiaWQiOiMzNyIsImxhYmVsIjoiMzciLCJ4Ijo2MzguODksInkiOjQ0My40N30seyJpZCI6IjM4IiwibGFiZWwiOiMzOCIsIngiOjYyOC4yOSwieSI6MzQyLjU2fSx7ImlkIjoiMzkiLCJsYWJlbCI6IjM5IiwieCI6NTg0LjU1LCJ5Ijo0NTEuMzF9LHsiaWQiOiI0MCIsImxhYmVsIjoiNDAiLCJ4Ijo1NzcuNzMsInkiOjM2NC43Nn0seyJpZCI6IjQxIiwibGFiZWwiOiI0MSIsIngiOjU0OC43OSwieSI6NDA5Ljc1fSx7ImlkIjoiMS4gRHJhZyBub2Rlcy4gVG9nZ2xlIFwiUGluIG9uIGRyYWdcIiB0byBsb2NrIGNvb3JkaW5hdGVzIGF1dG9tYXRpY2FsbHkuIiwibGFiZWwiOiIxLiBEcmFnIG5vZGVzLiBUb2dnbGUgXCJQaW4gb24gZHJhZ1wiIHRvIGxvY2sgY29vcmRpbmF0ZXMgYXV0b21hdGljYWxseS4iLCJ4IjoxNzcuNDksInkiOjI2Ni43OCwicGlubmVkIjp0cnVlfSx7ImlkIjoiMi4gQ2xpY2sgYW55IGxvY2tlZCBub2RlIHRvIHJlbGVhc2UgaXQgYmFjayBpbnRvIHRoZSBzaW11bGF0aW9uLiILCJsYWJlbCI6IjIuIENsaWNrIGFueSBsb2NrZWQgbm9kZSB0byByZWxlYXNlIGl0IGJhY2sgaW50byB0aGUgc2ltdWxhdGlvbi4iLCJ4IjoyOTUuNzEsInkiOjMxMy4zMiwicGlubmVkIjp0cnVlfSx7ImlkIjoiMy4gQ2xpY2sgXCJSZWxlYXNlIGxvY2tlZCBub2Rlc1wiIGluIHRoZSB0b29sYmFyIHRvIHVubG9jayBhbGwgbm9kZXMuIiwibGFiZWwiOiIzLiBDbGljayBcIlJlbGVhc2UgbG9ja2VkIG5vZGVzXCIgaW4gdGhlIHRvb2xiYXIgdG8gdW5sb2NrIGFsbCBub2Rlcy4iLCJ4IjoyNTAuNDMsInkiOjQzMS41NSwicGlubmVkIjp0cnVlfSx7ImlkIjoiNC4gVXNlIHNpZGViYXIgc2xpZGVycyB0byBmaW5lLXR1bmUgYXR0cmFjdGlvbiwgcmVwdWxzaW9uLCBhbmQgc3R5bGVzLiIsImxhYmVsIjoiNC4gVXNlIHNpZGViYXIgc2xpZGVycyB0byBmaW5lLXR1bmUgYXR0cmFjdGlvbiwgcmVwdWxzaW9uLCBhbmQgc3R5bGVzLiIsIngiOjE0NC43OCwieSI6NDU0LjE4LCJwaW5uZWQiOnRydWV9LHsiaWQiOiI1LiBTY3JvbGwgdGhlIGNhbnZhcyB0byB6b29tLCBhbmQgZHJhZyB0aGUgYmFja2dyb3VuZCB0byBwYW4uIiwibGFiZWwiOiI1LiBTY3JvbGwgdGhlIGNhbnZhcyB0byB6b29tLCBhbmQgZHJhZyB0aGUgYmFja2dyb3VuZCB0byBwYW4uIiwieCI6NTgsInkiOjMzNy4yMSwicGlubmVkIjp0cnVlfSx7ImlkIjoiQXV0byBUZXh0IFdyYXBwaW5nIiwibGFiZWwiOiJBdXRvIFRleHQgV3JhcHBpbmciLCJ4Ijo0NzkuOCwibmV3X3kiOjM5Ljh9LHsiaWQiOiJCaXBhcnRpdGUgSHVicyIsImxhYmVsIjoiQmlwYXJ0aXRlIEh1YnMiLCJ4Ijo3NDEuNjQsInkiOjEyOC43OH0seyJpZCI6IkNvbXBvbmVudCBTcGFjaW5nIiwibGFiZWwiOiJDb21wb25lbnQgU3BhY2luZyIsIngiOjg0NS4xMywieSI6NTI2LjI5fSx7ImlkIjoiRHluYW1pYyBBc3BlY3QgUmF0aW8iLCJsYWJlbCI6IkR5bmFtaWMgQXNwZWN0IFJhdGlvIiwieCI6NTE3LjgxLCJ5IjoxMzR9LHsiaWQiOiJFbmNsb3NpbmcgQmxvYnMiLCJsYWJlbCI6IkVuY2xvc2luZyBCbG9icyIsIngiOjY0OS44MSwieSI6MjMzLjh9LHsiaWQiOiJIb3ZlciBUb29sdGlwcyIsImxhYmVsIjoiSG92ZXIgVG9vbHRpcHMiLCJ4Ijo1ODYuODIsInkiOjIwLjc2fSx7ImlkIjoiSHlwZXJncmFwaCBFbGVtZW50cyIsImxhYmVsIjoiSHlwZXJncmFwaCBFbGVtZW50cyIsIngiOjc2MS43NiwieSI6MjU0Ljl9LHsiaWQiOiJJbnRlcmFjdGl2ZSBDYW52YXMiLCJsYWJlbCI6IkludGVyYWN0aXZlIENhbnZhcyIsIngiOjc1MS42MiwieSI6Mzc5LjE3fSx7ImlkIjoiSW50ZXJhY3RpdmUgRHJhZyIsImxhYmVsIjoiSW50ZXJhY3RpdmUgRHJhZyIsIngiOjEwMjMuMjYsInkiOjI1NC42Nn0seyJpZCI6IkxpbmsgYXR0cmFjdGlvbiIsImxhYmVsIjoiTGluayBhdHRyYWN0aW9uIiwieCI6OTQzLjU0LCJ5Ijo1NzEuNn0seyJpZCI6IlBhbiAmIFpvb20gQ2FudmFzIiwibGFiZWwiOiJQYW4gJiBab29tIENhbnZhcyIsIngiOjkwOS4zNSwieSI6MTY0LjcyfSx7ImlkIjoiUGh5c2ljcyBTaW11bGF0aW9uIiwibGFiZWwiOiJQaHlzaWNzIFNpbXVsYXRpb24iLCJ4Ijo4NzAuODEsInkiOjQxMC43MX0seyJpZCI6IlBpbiBOb2RlcyIsImxhYmVsIjoiUGluIE5vZGVzIiwieCI6OTg5LjE5LCJ5IjoxNjAuMDd9LHsiaWQiOiJTVkcgLyBKU09OIEV4cG9ydGVycyIsImxhYmVsIjoiU1ZHIC8gSlNPTiBFeHBvcnRlcnMiLCJ4IjozNTguNjksInkiOjUyLjI1fSx7ImlkIjoiVXNlciBJbnRlcmFjdGlvbnMiLCJsYWJlbCI6IlVzZXIgSW50ZXJhY3Rpb25zIiwieCI6ODkxLjA5LCJ5IjoyNzcuNH0seyJpZCI6IlZlcnRleCBSZXB1bHNpb24iLCJsYWJlbCI6IlZlcnRleCBSZXB1bHNpb24iLCJ4Ijo5ODAuOTgsInkiOjY2LjkxfSx7ImlkIjoiVmVydGljZXMgLyBOb2RlcyIsImxhYmVsIjoiVmVydGljZXMgLyBOb2RlcyIsIngiOjYyNC4yNywieSI6MTI4LjgxfSx7ImlkIjoiV29sZnJhbSAmIFB5dGhvbiBMaXN0cyIsImxhYmVsIjoiV29sZnJhbSAmIFB5dGhvbiBMaXN0cyIsIngiOjQwMS40MywieSI6LTQ5LjE5fV0sImh5cGVyZWRnZXMiOlt7ImlkIjoxLCJ2ZXJ0aWNlcyI6WyI5IiwiMTAiLCIxIl19LHsiaWQiOjIsInZlcnRpY2VzIjpbIjEiLCIyIiwiMyJdfSx7ImlkIjozLCJ2ZXJ0aWNlcyI6WyIzIiwiNCIsIjUiXX0seyJpZCI6NCwidmVydGljZXMiOlsiNSIsIjYiLCI3Il19LHsiaWQiOjUsInZlcnRpY2VzIjpbIjciLCI4IiwiOSJdfSx7ImlkIjo2LCJ2ZXJ0aWNlcyI6WyIxMSIsIjEyIiwiMTMiXX0seyJpZCI6NywidmVydGljZXMiOlsiMTQiLCIxNSIsIjE2Il19LHsiaWQiOjguLCJ2ZXJ0aWNlcyI6WyIxNyIsIjE4IiwiMTkiXX0seyJpZCI6OSwidmVydGljZXMiOlsiMTMiLCIxNCJdfSx7ImlkIjoxMCwidmVydGljZXMiOlsiMTYiLCIxNyJdfSx7ImlkIjoxMSwidmVydGljZXMiOlsiMTkiLCIxOSJdfSx7ImlkIjoxMiwidmVydGljZXMiOlsiMjEiXX0seyJpZCI6MTMsInZlcnRpY2VzIjpbIjIyIiwiMjMiXX0seyJpZCI6MTQsInZlcnRpY2VzIjpbIjI0IiwiMjUiLCIyNiJdfSx7ImlkIjoxNSwidmVydGljZXMiOlsiMjcisIsIjI4IiwiMjkiLCIzMCJdfSx7ImlkIjoxNiwidmVydGljZXMiOlsiMzEiLCIzMiIsIjMzIiwiMzQiLCIzNSJdfSx7ImlkIjoxNywidmVydGljZXMiOlsiMzYiLCIzNyIsIjM4IiwiMzkiLCI5MCIsIjQxIl19LHsiaWQiOjE4LCJ2ZXJ0aWNlcyI6WyJJbnRlcmFjdGl2ZSBDYW52YXMiLCJIeXBlcmdyYXBoIEVsZW1lbnRzIiwiUGh5c2ljcyBTaW11bGF0aW9uIiwiVXNlciBJbnRlcmFjdGlvbnMiXX0seyJpZCI6MTksInZlcnRpY2VzIjpbIkh5cGVyZ3JhcGggRWxlbWVudHMiLCJWZXJ0aWNlcyAvIE5vZGVzIiwiQmlwYXJ0aXRlIEh1YnMiLCJFbmNsb3NpbmcgQmxvYnMiXX0seyJpZCI6MjAsInZlcnRpY2VzIjpbIlBoeXNpY3MgU2ltdWxhdGlvbiIsIkxpbmsgYXR0cmFjdGlvbiIsIlZlcnRleCBSZXB1bHNpb24iLCJDb21wb25lbnQgU3BhY2luZyJdfSx7ImlkIjoyMSwidmVydGljZXMiOlsiVXNlciBJbnRlcmFjdGlvbnMiLCJJbnRlcmFjdGl2ZSBEcmFnIiwiUGFuICYgWm9vbSBDYW52YXMiLCJQaW4gTm9kZXMiXX0seyJpZCI6MjIsInZlcnRpY2VzIjpbIlZlcnRpY2VzIC8gTm9kZXMiLCJBdXRvIFRleHQgV3JhcHBpbmciLCJEeW5hbWljIEFzcGVjdCBSYXRpbyIsIkhvdmVyIFRvb2x0aXBzIl19LHsiaWQiOjIzLCJ2ZXJ0aWNlcyI6WyJBdXRvIFRleHQgV3JhcHBpbmciLCJXb2xmcmFtICYgUHl0aG9uIExpc3RzIiwiU1ZHIC8gSlNPTiBFeHBvcnRlcnMiXX0seyJpZCI6MjQsInZlcnRpY2VzIjpbIjMuIERyYWcgbm9kZXMuIFRvZ2dsZSBcIlBpbiBvbiBkcmFnXCIgdG8gbG9jayBjb29yZGluYXRlcyBhdXRvbWF0aWNhbGx5LiIsIjIuIENsaWNrIGFueSBsb2NrZWQgbm9kZSB0byByZWxlYXNlIGl0IGJhY2sgaW50byB0aGUgc2ltdWxhdGlvbi4iLCIzLiBDbGljayBcIlJlbGVhc2UgbG9ja2VkIG5vZGVzXCIgaW4gdGhlIHRvb2xiYXIgdG8gdW5sb2NrIGFsbCBub2Rlcy4iLCI0LiBVc2Ugc2lkZWJhciBzbGlkZXJzIHRvIGZpbmUtdHVuZSBhdHRyYWN0aW9uLCByZXB1bHNpb24sIGFuZCBzdHlsZXMuIiwiNS4gU2Nyb2xsIHRoZSBjYW52YXMgdG8gem9vbSwgYW5kIGRyYWcgdGhlIGJhY2tncm91bmQgdG8gcGFuLiJdfV0sIm9wdGlvbnMiOnsid2lkdGgiOjEwODAsImhlaWdodCI6Nzc4LCJjYW52YXNCZyI6InRyYW5zcGFyZW50IiwiY2FudmFzQmdDdXN0b20iOiIjZmZmZmZmIiwibGF5b3V0VHlwZSI6InNwcmluZy1lbWJlZGRpbmciLCJ2ZXJ0ZXhTaXplIjowLjA1LCJ2ZXJ0ZXhPdXRsaW5lV2lkdGgiOjEuNSwicGxvdFRoZW1lIjoibmFtZS1sYWJlbGVkIiwibm9kZUZpbGxUeXBlIjoiYXV0b21hdGljIiwibm9kZUZpbGxDdXN0b20iOiIjZmZmZmZmIiwibGFiZWxGb250RmFtaWx5IjoibW9ub3NwYWNlIiwibGFiZWxGb250U2l6ZSI6MTMsInNob3dTdWJzZXRCb3VuZGFyeSI6dHJ1ZSwiYm91bmRhcnlTY2FsZSI6MiwiYmxvYk9wYWNpdHkiOjAuMTgLCJibG9iT3V0bGluZVdpZHRoIjoxLjUsInNob3dTdWJzZXRFZGdlIjp0cnVlLCJlZGdlV2lkdGgiOjIsImVkZ2VQYWxldHRlIjoiYWNhZGVtaWMtYm9sZCIsImVkZ2VDb2xvckN1c3RvbSI6IiMzYjgyZjYiLCJzaG93SHVicyI6ZmFsc2UsInNob3dHcmlkIjpmYWxzZSwiZ3JpZENvbG9yIjoiIzAwMDAwMCIsImdyaWRPcGFjaXR5IjowLjA0LCJwaHlzaWNzUGxheWluZyI6dHJ1ZSwicGluT25EcmFnIjp0cnVlLCJhbGxvd1BhbiI6dHJ1ZSwiYWxsb3dab29tIjp0cnVlLCJhbGxvd0RyYWciOnRydWUsImluaXRpYWxab29tIjpudWxsLCJrQXR0cmFjdCI6MC4yLCJrUmVwZWwiOjEwMDAwLCJrSHlwZXJlZGdlUmVwZWwiOjEwMDAwLCJrQ2VudGVyIjowLjAwNCwicmVzdExlbmd0aCI6MCwiY29tcG9uZW50IFNwYWNpbmciOjkwLCJkYW1waW5nIjowLjg4LCJtYXhTcGVlZCI6MTB9fQ==" width="100%" height="500" style="border: 1px solid #ddd; border-radius: 8px;" allowfullscreen></iframe>

---

## 3. API Reference

### `new HypergraphPlotter(container, options)`
Constructor. Creates and mounts the SVG canvas.
- **`container`**: A query selector string (e.g., `'#canvas-container'`) or a DOM Element (typically a `<div>` or `<svg>`).
- **`options`**: An optional configuration object (see [Configurations](#3-configurations)).

---

### Public Methods

#### `setData(data)`
Loads vertices and hyperedges into the plotter and triggers layout recalculation.
- **`data`**: An object structure:
  ```json
  {
    "vertices": [
      { "id": "v1", "label": "Label 1" }
    ],
    "hyperedges": [
      { "id": 1, "vertices": ["v1", "v2"], "color": "#ff0000" }
    ]
  }
  ```
  *(Note: An optional per-edge `"color"` property overrides the palette color).*

#### `setOptions(options)`
Dynamically updates options parameters and redraws the canvas.
- **`options`**: Custom configurations object.

#### `startSimulation()`
Starts the force-directed layout simulation animation loop. (Automatically called upon instantiation).

#### `stopSimulation()`
Cancels the force animation frame loop.

#### `recenter()`
Translates the viewport to center the graph without altering the current zoom level.

#### `zoomToFit(padding = null)`
Rescales the viewport zoom level and centers the view bounding box to fit all active nodes.
- **`padding`**: Optional number override for boundary margins around the graph. If not provided, it defaults to a responsive padding equal to `Math.min(width * 0.33, height * 0.33)` (with a minimum limit of 40px) to keep the graph size comfortable inside the viewport.

#### `getSVGString()`
Returns a standalone, self-contained SVG string representing the current graph state. Visual styling is inlined as presentation attributes (making it perfect for direct file downloads or vector editing tools like Illustrator or Inkscape).

#### `destroy()`
Cancels the simulation loops and removes the SVG canvas from the DOM container.

---

### Callback Hooks

Attach callbacks directly to the instance properties:

* **`plotter.onSelectionChanged = (selectedIds) => { ... }`**
  Triggered when a vertex or node is clicked and selection changes.
* **`plotter.onNodeDragged = (nodeId, stage, coords) => { ... }`**
  Fires during node interaction. `stage` will be `'start'`, `'drag'`, or `'end'`.
* **`plotter.onDataChanged = () => { ... }`**
  Fires when the dataset is loaded or modified.

---

## 3. Configurations

Configure layouts and styles by passing these keys in the options object or using `setOptions(opts)`:

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`width`** | *Number* | `800` | Fallback width of simulation space if container is not measured. |
| **`height`** | *Number* | `600` | Fallback height of simulation space if container is not measured. |
| **`layoutType`** | *String* | `'spring-embedding'` | Layout algorithm: `'spring-embedding'`, `'radial-embedding'`, or `'grid-layout'`. |
| **`plotTheme`** | *String* | `'name-labeled'` | Visual theme: `'name-labeled'` (default with text labels), `'detailed'` (text labels outside nodes), or `'clean'` (no text labels). |
| **`canvasBg`** | *String* | `'transparent'` | Canvas background color: `'transparent'`, `'white'`, `'light-grey'`, `'dark-slate'`, or `'custom'`. |
| **`canvasBgCustom`** | *String* | `'#ffffff'` | Hex color used when `canvasBg` is set to `'custom'`. |
| **`vertexSize`** | *Number* | `0.15` | Dimensionless scale factor for node circles. The default value `0.15` corresponds to a radius of 12 px at the base zoom. |
| **`vertexOutlineWidth`**| *Number* | `1.5` | Outline border thickness of vertices in pixels (px). |
| **`nodeFillType`** | *String* | `'automatic'` | Node circle fill: `'automatic'` (contrasted to background) or `'custom'`. |
| **`nodeFillCustom`** | *String* | `'#ffffff'` | Hex color used when `nodeFillType` is set to `'custom'`. |
| **`labelFontFamily`** | *String* | `'sans-serif'` | Label typography: `'sans-serif'`, `'serif'`, or `'monospace'`. |
| **`labelFontSize`** | *Number* | `12` | Label font size (px). |
| **`showSubsetBoundary`**| *Boolean*| `true` | If true, draws rounded enclosing hulls (blobs) around hyperedge nodes. |
| **`boundaryScale`** | *Number* | `2.0` | Dimensionless scale multiplier controlling the outer padding of hyperedge boundary blobs relative to the vertex radius. |
| **`blobOpacity`** | *Number* | `0.18` | Transparency value for hyperedge blobs (range 0.0 to 1.0). |
| **`blobOutlineWidth`** | *Number* | `1.5` | Outline border thickness of blobs (px). |
| **`showSubsetEdge`** | *Boolean*| `true` | If true, renders Bezier curves linking vertices to their hyperedge hub centers. |
| **`edgeWidth`** | *Number* | `2.0` | Bezier curve edge line thickness in pixels (px). |
| **`edgePalette`** | *String* | `'rainbow'` | Edge color maps: `'rainbow'`, `'grayscale'`, `'pastel'`, `'cool-ice'`, `'warm-sunset'`, `'ocean-breeze'`, `'forest-earth'`, `'neon-glow'`, `'viridis'`, `'plasma'`, `'cividis'`, `'magma'`, `'inferno'`, `'cyberpunk'`, `'aurora'`, `'desert-sand'`, `'botanical'`, `'berry-wine'`, `'academic-bold'`, `'academic-set1'`, `'academic-set2'`, `'academic-dark'`, `'academic-paired'`, or `'custom-solid'`. |
| **`edgeColorCustom`** | *String* | `'#3b82f6'` | Hex color globally applied to all edges when `edgePalette` is set to `'custom-solid'`. |
| **`showHubs`** | *Boolean*| `false` | Displays the virtual force centers (hubs) as interactive handles. |
| **`showGrid`** | *Boolean*| `false` | Renders a background coordinate alignment grid. |
| **`gridColor`** | *String* | `'#000000'` | Hex color of the grid overlay. |
| **`gridOpacity`** | *Number* | `0.04` | Opacity value of grid lines (range 0.0 to 0.5). |
| **`physicsPlaying`** | *Boolean*| `true` | Toggles whether force calculations are running. |
| **`pinOnDrag`** | *Boolean*| `false` | Automatically sets dragged nodes to fixed coordinates (pinned state). |

### Layout Physics Options

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`kAttract`** | *Number* | `0.2` | Link attraction coefficient — spring stiffness. |
| **`kRepel`** | *Number* | `10000` | Vertex-to-vertex repulsion force coefficient. |
| **`kHyperedgeRepel`** | *Number* | `10000` | Hyperedge-to-hyperedge (and hyperedge-to-vertex) repulsion force coefficient. |
| **`kCenter`** | *Number* | `0.004` | Center-of-gravity coefficient. |
| **`restLength`** | *Number* | `0` | Equilibrium rest length of spring links. |
| **`componentSpacing`** | *Number* | `90` | Separation boundary between disconnected components. |
| **`damping`** | *Number* | `0.88` | Velocity decay coefficient per frame. |
| **`maxSpeed`** | *Number* | `10` | Maximum velocity cap per node per simulation frame. |

---

## 4. Default Configuration File (`config.json`)

The web app ships with a `config.json` file that lets you override the library defaults without touching any code. On startup the app fetches this file and passes its values to `setOptions()`, so any key listed in [Section 3](#3-configurations) can be set here.

```json
{
  "vertexSize": 0.15,
  "vertexOutlineWidth": 1.5,
  "plotTheme": "name-labeled",
  "labelFontSize": 12,
  "showSubsetBoundary": true,
  "boundaryScale": 2.0,
  "blobOpacity": 0.18,
  "blobOutlineWidth": 1.5,
  "showSubsetEdge": true,
  "edgeWidth": 2.0,
  "showHubs": false,
  "showGrid": false,
  "gridOpacity": 0.04,
  "pinOnDrag": false,
  "kAttract": 0.2,
  "kRepel": 10000,
  "kHyperedgeRepel": 10000,
  "kCenter": 0.004,
  "restLength": 0,
  "componentSpacing": 90,
  "damping": 0.88,
  "maxSpeed": 10
}
```

To change a default: edit the value in `config.json`, save, and refresh the browser. The file is silently ignored if it is missing (the library's built-in defaults take over).
