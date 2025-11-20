# Component Name

Brief description of the component and its purpose.

## Usage

```vue
<template>
  <ComponentName 
    :prop1="value1"
    :prop2="value2"
    @event1="handleEvent1"
  />
</template>

<script setup>
import { ComponentName } from 'openbadges-ui';

const handleEvent1 = (payload) => {
  console.log('Event received:', payload);
};
</script>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `prop1` | `Type` | `defaultValue` | Description of the prop and its purpose. |
| `prop2` | `Type` | `defaultValue` | Description of the prop and its purpose. |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `event1` | `PayloadType` | Description of when the event is emitted and what the payload contains. |
| `event2` | `PayloadType` | Description of when the event is emitted and what the payload contains. |

## Slots

| Name | Props | Description |
|------|-------|-------------|
| `default` | None | Description of the default slot. |
| `namedSlot` | `{ item: Item }` | Description of the named slot and the props it receives. |

## CSS Variables

| Name | Default | Description |
|------|---------|-------------|
| `--variable-name` | `defaultValue` | Description of the CSS variable and how it affects the component. |

## Accessibility

Information about the component's accessibility features, including:
- ARIA attributes
- Keyboard navigation
- Screen reader considerations

## Examples

### Basic Example

```vue
<template>
  <ComponentName :prop1="value1" />
</template>
```

### Advanced Example

```vue
<template>
  <ComponentName 
    :prop1="value1"
    :prop2="value2"
    @event1="handleEvent1"
  >
    <template #namedSlot="{ item }">
      Custom content for {{ item.name }}
    </template>
  </ComponentName>
</template>
```

## Edge Cases and Limitations

Information about any edge cases, limitations, or known issues with the component.

## Related Components

- [RelatedComponent1](./RelatedComponent1.md)
- [RelatedComponent2](./RelatedComponent2.md)
