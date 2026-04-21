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
    position: "bottom-right",
    accentColor: "#14532d",
    title: "Scout",
  })
</script>
```

## Options

- `tenantId`
  - Required tenant/company id used for branding, widget access, and Scout behavior.
- `apiUrl`
  - Optional API base URL. Defaults to `http://localhost:3001`.
- `position`
  - Optional widget placement. Supported values:
    - `bottom-right`
    - `bottom-left`
    - `top-right`
    - `top-left`
- `accentColor`
  - Optional theme color used for the launcher, buttons, badges, and focus states.
  - If omitted, the widget will use the tenant's configured widget accent color when available.
- `title`
  - Optional widget title. Falls back to the tenant brand name, then `Scout`.
