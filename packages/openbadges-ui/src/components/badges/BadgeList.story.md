# BadgeList

The `BadgeList` component displays a collection of badges with filtering and sorting capabilities. It supports both grid and list layouts, pagination, and loading states.

## When To Use

- When you need to display multiple badges in a collection
- When you want to provide pagination for large collections of badges
- When you need to show a loading state while badges are being fetched
- When you want to provide different layout options (grid or list)

## Examples

Use the controls in the right panel to customize the component behavior.

### Basic Usage

```vue
<BadgeList :badges="myBadges" />
```

### List Layout

```vue
<BadgeList :badges="myBadges" layout="list" />
```

### With Pagination

```vue
<BadgeList
  :badges="myBadges"
  :page-size="10"
  :current-page="1"
  :show-pagination="true"
  @page-change="handlePageChange"
/>
```

### Custom Empty State

```vue
<BadgeList :badges="[]">
  <template #empty>
    <p>No badges found. Earn your first badge!</p>
  </template>
</BadgeList>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `badges` | `(OB2.Assertion \| OB3.VerifiableCredential)[]` | Required | Array of badges to display |
| `layout` | `'grid' \| 'list'` | `'grid'` | Layout mode for displaying badges |
| `interactive` | `boolean` | `true` | Whether badges are clickable |
| `loading` | `boolean` | `false` | Whether to show loading state |
| `pageSize` | `number` | `9` | Number of badges to display per page |
| `currentPage` | `number` | `1` | Current page number |
| `showPagination` | `boolean` | `false` | Whether to show pagination controls |
| `ariaLabel` | `string` | `'List of badges'` | Accessibility label for the badge list |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `badge-click` | `OB2.Assertion \| OB3.VerifiableCredential` | Emitted when a badge is clicked |
| `page-change` | `number` | Emitted when the current page changes |

## Slots

| Name | Props | Description |
|------|-------|-------------|
| `empty` | None | Content to display when there are no badges |
| `badge` | `{ badge, normalized }` | Custom badge rendering |

## Accessibility

The component includes several accessibility features:

- The badge list has an appropriate ARIA label
- Loading state is announced to screen readers
- Empty state is announced to screen readers
- Pagination controls are keyboard accessible
