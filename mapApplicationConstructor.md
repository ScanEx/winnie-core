# Map Application

Приложение, состоящие из карты с набором контролов.

## Ключи конфигурационного файла

Ключами конфигурационного файла являются идентификаторы настраиваемых компонентов, которым эти настройки передаются. Более подробную информацию по каждому из них см. ниже.

| **Имя** | **Значение по умолчанию** | **Описание** |
| --- | --- | --- |
| `map` | `{ center: [51.505, -0.09], zoom: 13, attributionControl: false, zoomControl: false } ` | настройки карты Leaflet |
| `gmxMap` | `{ setZIndex: true }` | настройки Геомиксера |
| `logoControl` | `{ }` | настройки контрола логотипа |
| `hideControl` | `{ }` | настройки контрола скрытия (`false` - не показывать) |
| `zoomControl` | `{ }` | настройки контрола зума (`false` - не показывать) |
| `centerControl` | `{ color: 'black' }` | настройки контрола обозначения центра карты (`false` - не показывать) |
| `bottomControl` | `{ }` | настройки контрола нижнего фона (`false` - не показывать) |
| `locationControl` | `{ }` | настройки контрола координат (`false` - не показывать) |
| `copyrightControl` | `{ }` | настройки контрола копирайта (`false` - не показывать) |

## Настраиваемые компоненты

### map

Хеш передаётся карте Leaflet. Все доступные настройки см. в [документации](http://leafletjs.com/reference.html#map-class).

Некоторые распространённые настройки:

- `<Array>center` - координаты центра карты. Например `[51.505, -0.09]`
- `<Number>zoom` - изначальный зум карты. Например `13`
- `<Number>minZoom` - минимальный зум карты
- `<Number>maxZoom` - максимальный зум карты

### gmxMap

Хеш передаётся компоненту Leaflet-GeoMixer. Все доступные настройки см. в [документации](https://github.com/ScanEx/Leaflet-GeoMixer/blob/master/documentation-rus.md).

Некоторые распространённые настройки:

- `<String>mapID` - идентификатор карты
- `<String>apiKey` - API-ключ

### *Control

Ключи, оканчивающиеся на 'Control' соответствуют контролами карты. Настройки по каждому из них см. в [документации](https://github.com/ScanEx/gmxControls/blob/master/documentation-rus.md).

Контролам `zoomControl` и `copyrightControl` можно вместо настроек передать строку `'leaflet'`. В этом случае они будут заменены соответствующими контролами leaflet'а.

## Пример типичного конфигурационного файла

```javascript
{
    map: {
        center: [55.750303, 37.619934],
        zoom: 8
    },
    gmxMap: {
        mapID: '37TYY',
        apiKey: 'W4IH6K7CJ4'
    },
    zoomControl: 'leaflet',
    hideControl: false,
    centerControl: {
        color: '#121212'
    }
}
```