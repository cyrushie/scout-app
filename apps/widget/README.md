# Scout Widget

Embeddable Scout chat widget for company sites.

## Build

```bash
npm run build --workspace @scout/widget
```

## Basic Usage

```html
<script type="module" src="/dist/embed.js"></script>
<scout-widget
  tenant-id="scout-direct"
  api-url="http://localhost:3001"
  position="bottom-right"
  widget-title="Scout"
></scout-widget>
```

## JavaScript Mount

```html
<script type="module" src="/dist/embed.js"></script>
<script>
  window.ScoutWidget.mount({
    tenantId: "scout-direct",
    apiUrl: "http://localhost:3001",
    title: "Scout",
  })
</script>
```
