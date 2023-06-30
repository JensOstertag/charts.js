# charts.js
A JavaScript Plugin to draw Charts to visualize Data and Statistics on Websites.

## Examples
### Line Chart
```js
new Chart().create({
    htmlElementId: "canvas",
    chartType: "curve",
    chartStyle: {
        mainColor: "#888888",
        valueColors: [
            "#2f7cff"
        ]
    },
    data: {
        keys: [
          "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"
        ],
        values: [
            [
                getRandomArbitrary(-5, 10),
                getRandomArbitrary(-5, 10),
                getRandomArbitrary(-5, 10),
                getRandomArbitrary(-5, 10),
                getRandomArbitrary(-5, 10),
                getRandomArbitrary(-5, 10),
                getRandomArbitrary(-5, 10),
                getRandomArbitrary(-5, 10),
                getRandomArbitrary(-5, 10),
                getRandomArbitrary(-5, 10)
            ]
        ]
    }
});
```
![grafik](https://github.com/JensOstertag/charts.js/assets/49905418/d0475666-326b-407b-a423-904849c7755d)

### Bar Chart
```js
new Chart().create({
    htmlElementId: "canvas",
    chartType: "bar",
    chartStyle: {
        mainColor: "#888888",
        valueColors: [
            "#2f7cff"
        ]
    },
    data: {
        keys: [
          "0", "1", "2", "3", "4", "5"
        ],
        values: [
            [
                0,
                1,
                2,
                3,
                4,
                5
            ]
        ]
    }
});
```
![grafik](https://github.com/JensOstertag/charts.js/assets/49905418/33621f0d-c403-4051-a52a-2110ab0ccd84)
