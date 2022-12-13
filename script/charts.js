const RESIZE_FACTOR = 20;
const resize = (value) => {
    return value * RESIZE_FACTOR;
}

const SIDE_SPACE = 25;

class Chart {
    create = (chartConfiguration) => {
        if(!(this.validateConfiguration(chartConfiguration))) {
            throw "ChartConfiguration invalid";
        }

        console.log(chartConfiguration);

        let chartCanvas = document.getElementById(chartConfiguration.htmlElementId);
        let canvasContext = chartCanvas.getContext("2d");

        // Set the Canvas' Size to the same Size as the Elements actual Size
        chartCanvas.width = resize(chartCanvas.clientWidth);
        chartCanvas.height = resize(chartCanvas.clientHeight);
        
        let width = chartCanvas.width;
        let height = chartCanvas.height;

        // Get the Min and Max from all Values to scale the Axes
        let minValue = 0;
        let maxValue = 0;
        let maxLabel = 0;
        let minLabel = 0;
        chartConfiguration.data.values.forEach(dataset => {
            dataset.forEach(value => {
                if(value > maxValue) {
                    maxValue = value;
                    maxLabel = value;
                }

                if(value < minValue) {
                    minValue = value;
                    minLabel = value;
                }
            });
        });

        let spaceFromTop = 0;
        if(maxValue !== 0) {
            maxValue = Math.ceil(maxValue / 5) * 5 + 1.5;
            maxLabel = Math.ceil(maxLabel / 5) * 5;
        } else {
            spaceFromTop = 20 * RESIZE_FACTOR;
        }
        
        let spaceFromBottom = 0;
        if(minValue !== 0) {
            minValue = Math.floor(minValue / 5) * 5 - 1.5;
            minLabel = Math.floor(minLabel / 5)* 5;
        } else {
            spaceFromBottom = -20 * RESIZE_FACTOR;
        }

        // Calculate the Pixels per Unit for both Axes
        const pixelsPerXUnit = (width - SIDE_SPACE * RESIZE_FACTOR) / (chartConfiguration.data.keys.length);
        const pixelsPerYUnit = height / (maxValue - minValue);
        const zeroHeight = height - (-minValue * pixelsPerYUnit);

        // Context Settings
        canvasContext.strokeStyle = chartConfiguration.chartStyle.mainColor;
        canvasContext.fillStyle = chartConfiguration.chartStyle.mainColor;
        canvasContext.lineWidth = 1 * RESIZE_FACTOR;
        canvasContext.font = 10 * RESIZE_FACTOR + "px " + chartConfiguration.chartStyle.fontFamily;

        // Axes
        {
            canvasContext.beginPath();
            canvasContext.moveTo(SIDE_SPACE * RESIZE_FACTOR, 0 + spaceFromTop);
            canvasContext.lineTo(SIDE_SPACE * RESIZE_FACTOR, height + spaceFromBottom);
            canvasContext.stroke();
        }

        {
            canvasContext.beginPath();
            canvasContext.moveTo(SIDE_SPACE * RESIZE_FACTOR, zeroHeight + spaceFromBottom + spaceFromTop);
            canvasContext.lineTo(width - SIDE_SPACE * RESIZE_FACTOR, zeroHeight + spaceFromBottom + spaceFromTop);
            canvasContext.stroke();
        }

        // X-Axis Labels
        let drawXLabelsBelowX = Math.abs(minValue) <= Math.abs(maxValue);
        for(let i = 0; i < chartConfiguration.data.keys.length; i++) {
            let label = chartConfiguration.data.keys[i];
            let x = (i + .25) * pixelsPerXUnit + SIDE_SPACE * RESIZE_FACTOR;
            this.drawXLabel(canvasContext, x, zeroHeight + spaceFromTop + spaceFromBottom, drawXLabelsBelowX, chartConfiguration.chartStyle.mainColor, label, pixelsPerXUnit);
        }

        // Y-Axis Labels
        let yLabelFactor = (maxLabel - minLabel) / 10;
        yLabelFactor = Math.ceil(yLabelFactor / Math.pow(10, Math.ceil(Math.log10(yLabelFactor)))) * Math.pow(10, Math.ceil(Math.log10(yLabelFactor)));
        yLabelFactor = (yLabelFactor === 0) ? .1 : yLabelFactor;
        for(let i = minLabel; i <= maxLabel; i += yLabelFactor) {
            let y = zeroHeight - i * pixelsPerYUnit + spaceFromTop + spaceFromBottom;
            this.drawYLabel(canvasContext, SIDE_SPACE * RESIZE_FACTOR, y, chartConfiguration.chartStyle.mainColor, i, (SIDE_SPACE - 10) * RESIZE_FACTOR);
        }

        for(let i = 0; i < chartConfiguration.data.values.length; i++) {
            let values = [];
            for(let j = 0; j < chartConfiguration.data.values[i].length; j++) {
                let value = chartConfiguration.data.values[i][j];
                let x = (j + .25) * pixelsPerXUnit + SIDE_SPACE * RESIZE_FACTOR;
                let y = zeroHeight - value * pixelsPerYUnit + spaceFromTop + spaceFromBottom;
                values.push({x: x, y: y});
            }

            let nodeColor = chartConfiguration.chartStyle.valueColors[i];
            let previousX = null;
            let previousY = null;
            for(let j = 0; j < chartConfiguration.data.values[i].length; j++) {
                let nodeSize = 5 * RESIZE_FACTOR;
                let x = values[j].x;
                let y = values[j].y;

                this.drawNode(canvasContext, x, y, nodeSize, nodeColor, previousX, previousY, chartConfiguration.chartType);

                previousX = x;
                previousY = y;
            }

            this.drawLine(canvasContext, nodeColor, values, .3, .6, chartConfiguration.chartType);
        }
    }

    drawXLabel = (context, x, zeroHeight, below, labelColor, label, pixelsPerXUnit) => {
        context.strokeStyle = labelColor + "ff";
        context.fillStyle = labelColor + "ff";

        context.beginPath();

        let y = zeroHeight;
        if(!(below)) {
            y -= 5 * RESIZE_FACTOR;
        }

        context.moveTo(x, y);
        y += 5 * RESIZE_FACTOR;
        context.lineTo(x, y);
        context.stroke();

        context.textAlign = "center";

        context.beginPath();

        if(!(below)) {
            y -= 10 * RESIZE_FACTOR;
        } else {
            y += 10 * RESIZE_FACTOR;
        }

        context.fillText(label, x, y, pixelsPerXUnit);
    }

    drawYLabel = (context, x, y, labelColor, label, pixelsPerXUnit) => {
        context.strokeStyle = labelColor + "ff";
        context.fillStyle = labelColor + "ff";

        context.beginPath();

        context.moveTo(x, y);
        context.lineTo(x - 5 * RESIZE_FACTOR, y);
        context.stroke();

        context.textAlign = "right";
        context.textBaseline = "middle";

        context.beginPath();

        context.fillText(label, x - 10 * RESIZE_FACTOR, y, pixelsPerXUnit);
    }

    drawNode = (context, x, y, nodeSize, nodeColor, previousX, previousY, chartType) => {
        context.strokeStyle = nodeColor + "ff";
        context.fillStyle = nodeColor + "88";

        switch(chartType) {
            case "node":
                console.log("drawing node");
                context.beginPath();
                context.arc(x, y, nodeSize/2, 0, 2 * Math.PI);
                context.stroke();
                context.fill();

                break;
            case "line":
                context.beginPath();
                context.arc(x, y, nodeSize/2, 0, 2 * Math.PI);
                context.stroke();
                context.fill();

                if(previousX !== null && previousY !== null) {
                    context.beginPath();
                    context.moveTo(x, y);
                    context.lineTo(previousX, previousY);
                    context.stroke();
                }

                break;
            case "curve": 
                context.beginPath();
                context.arc(x, y, nodeSize/2, 0, 2 * Math.PI);
                context.stroke();
                context.fill();
                break;
            case "bar":
                break;
            default:
                console.error("Invalid ChartType: " + chartType);
        }
    }

    gradient = (a, b) => {
        return (b.y - a.y) / (b.x - a.x);
    }

    drawLine = (context, nodeColor, points, f, t, chartType) => {
        if(chartType === "curve") {
            let previousPoint = null;
            let m = 0;
            let previousDeltaX = 0;
            let previousDeltaY = 0;
            for(let i = 0; i < points.length; i++) {
                if(i === 0) {
                    console.log("called first");
                    previousPoint = points[i];
                    context.moveTo(points[i].x, points[i].y);
                    continue;
                }

                let currentPoint = points[i];
                let nextPoint = points[i + 1];

                let currentDeltaX = 0;
                let currentDeltaY = 0;
                if(nextPoint) {
                    m = this.gradient(previousPoint, nextPoint);
                    currentDeltaX = (nextPoint.x - currentPoint.x) * (-f);
                    currentDeltaY = currentDeltaX * m * t;
                }

                context.bezierCurveTo(previousPoint.x - previousDeltaX, previousPoint.y - previousDeltaY, currentPoint.x + currentDeltaX, currentPoint.y + currentDeltaY, currentPoint.x, currentPoint.y);

                previousDeltaX = currentDeltaX;
                previousDeltaY = currentDeltaY;
                previousPoint = currentPoint;
            }

            context.stroke();
        }
    }

    getDerivativeAt = (previousValue, nextValue) => {
        let previousX = previousValue.x;
        let previousY = previousValue.y;

        let nextX = nextValue.x;
        let nextY = nextValue.y;

        let firstGradient = (nextY - previousY) / (nextX - previousX);
        return firstGradient;
    }

    validateConfiguration = (chartConfiguration) => {
        // HTML Element ID
        if(!(chartConfiguration.hasOwnProperty("htmlElementId"))) {
            console.error("ChartConfiguration requires a HTMLElementId property");
            return false;
        }

        // Chart Type
        if(!(chartConfiguration.hasOwnProperty("chartType"))) {
            console.error("ChartConfiguration Requires a ChartType property");
            return false;
        }

        // Data
        if(!(chartConfiguration.hasOwnProperty("data"))) {
            console.error("ChartConfiguration requires a Data property");
            return false;
        }

        let dataProperty = chartConfiguration.data;
        if(!(dataProperty.hasOwnProperty("keys") && dataProperty.hasOwnProperty("values"))) {
            console.error("ChartConfiguration requires a Data property with a Keys and Values property");
            return false;
        } 

        let keys = dataProperty.keys;
        let values = dataProperty.values;
        if(keys.length < 1) {
            console.error("ChartConfiguration requires at least one Value to be displayed");
            return false;
        }

        if(values.length < 1) {
            console.error("ChartConfiguration requires at least one Dataset to be displayed");
            return false;
        }

        let valuesLengthOK = true;
        values.forEach(value => {
            if(value.length !== keys.length) {
                console.error("ChartConfiguration requires the Values to be of the same length as the Keys");
                valuesLengthOK = false;
            }
        });

        if(!(valuesLengthOK)) {
            return false;
        }

        // Style
        if(!(chartConfiguration.hasOwnProperty("chartStyle"))) {
            console.error("ChartConfiguration requires a ChartStyle property");
            return false;
        }

        let chartStyleProperty = chartConfiguration.chartStyle;
        if(!(chartStyleProperty.hasOwnProperty("mainColor") && chartStyleProperty.hasOwnProperty("valueColors") && chartStyleProperty.hasOwnProperty("fontFamily"))) {
            console.error("ChartConfiguration requires a ChartStyle property with a MainColor and ValuesColor property");
            return false;
        }

        let valueColors = chartStyleProperty.valueColors;
        if(valueColors.length !== values.length) {
            console.error("ChartConfigiration requires the same amount of ValueColors as Datasets");
            return false;
        }

        return true;
    }
}