const RESIZE_FACTOR = 20;
const resize = (value) => {
    return value * RESIZE_FACTOR;
}

const SIDE_SPACE = 25;

const LABELS_PER_100_PIXELS = 3;

class Chart {
    resizeFactor = RESIZE_FACTOR;
    leftRightSpace = SIDE_SPACE * this.resizeFactor;
    labelsPer100Pixels = LABELS_PER_100_PIXELS;
    xAxisLabelsBelow = true;
    topBottomSpace = {
        top: 0,
        bottom: 0
    };
    canvasSpace = {
        width: 0,
        height: 0
    };
    coordinateSystemSpace = {
        offsets: {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
        }
    };
    dataSpace = {
        width: 0,
        height: 0,
        offsets: {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
        },
        dataSpacing: 0
    };
    pixelsPerYUnit = 0;

    extremeValues = {
        min: 0,
        max: 0
    }
    extremeLabels = {
        min: 0,
        max: 0
    }

    /**
     * Creates a new Chart with the given ChartConfiguration
     */
    create = (chartConfiguration) => {
        if(!(this.validateConfiguration(chartConfiguration))) {
            throw "ChartConfiguration invalid";
        }

        console.log(chartConfiguration);

        let chartCanvas = document.getElementById(chartConfiguration.htmlElementId);
        let canvasContext = chartCanvas.getContext("2d");

        // Set the CSize of the Canvas to the ClientSize of the HTML Element
        chartCanvas.width = resize(chartCanvas.clientWidth);
        chartCanvas.height = resize(chartCanvas.clientHeight);
        
        let width = chartCanvas.width;
        let height = chartCanvas.height;

        this.canvasSpace = {
            width: width,
            height: height
        };

        this.leftRightSpace = SIDE_SPACE * this.resizeFactor;

        // Get the Min and Max from all Values to scale the Axes
        chartConfiguration.data.values.forEach(dataset => {
            dataset.forEach(value => {
                if(value > this.extremeValues.max) {
                    this.extremeValues.max = value;
                }

                if(value < this.extremeValues.min) {
                    this.extremeValues.min = value;
                }
            });
        });

        if(this.extremeValues.min < 0 && this.extremeValues.max === 0) {
            this.xAxisLabelsBelow = false;
        }

        // Add extra Space to the Axes to prevent cutting off Nodes or Curves
        const minLength = Math.ceil(Math.log10(Math.abs(this.extremeValues.min) + 1));
        const maxLength = Math.ceil(Math.log10(Math.abs(this.extremeValues.max) + 1));

        this.extremeLabels.min = (this.extremeValues.min !== 0) ? Math.ceil(this.extremeValues.min / Math.pow(10, minLength - 2)) * Math.pow(10, minLength - 2) : 0;
        this.extremeValues.min = (this.extremeValues.min !== 0) ? Math.floor(this.extremeValues.min / Math.pow(10, minLength - 2)) * Math.pow(10, minLength - 2) - 1.5 * Math.pow(10, Math.max(minLength, maxLength, 2) - 3) : 0; 

        this.extremeLabels.max = (this.extremeValues.max !== 0) ? Math.floor(this.extremeValues.max / Math.pow(10, maxLength - 2)) * Math.pow(10, maxLength - 2) : 0;
        this.extremeValues.max = (this.extremeValues.max !== 0) ? Math.ceil(this.extremeValues.max / Math.pow(10, maxLength - 2)) * Math.pow(10, maxLength - 2) + 1.5 * Math.pow(10, Math.max(minLength, maxLength, 2) - 3) : 0;

        // Add Space at the Top or Bottom if the Chart only has positive or negative Values
        this.topBottomSpace.top = (this.extremeValues.max === 0) ? SIDE_SPACE * this.resizeFactor : 0;
        this.topBottomSpace.bottom = (this.extremeValues.min === 0) ? SIDE_SPACE * this.resizeFactor : 0;
        
        const dataPoints = chartConfiguration.data.keys.length;
        this.coordinateSystemSpace = {
            offsets: {
                left: this.leftRightSpace,
                right: this.leftRightSpace,
                top: this.topBottomSpace.top,
                bottom: this.topBottomSpace.bottom
            }
        };
        this.dataSpace = {
            width: width - this.leftRightSpace * 4,
            height: height - this.topBottomSpace.top - this.topBottomSpace.bottom,
            offsets: {
                left: this.leftRightSpace * 2,
                right: this.leftRightSpace * 2,
                top: this.topBottomSpace.top,
                bottom: this.topBottomSpace.bottom
            }
        }

        this.dataSpace.dataSpacing = this.dataSpace.width / (dataPoints - 1);

        // Calculate the Pixels per Unit for the Y Axis
        this.pixelsPerYUnit = this.dataSpace.height / (Math.abs(this.extremeValues.min) + Math.abs(this.extremeValues.max));

        // Draw Coordinate System and Datapoints
        this.drawCoordinateSystem(canvasContext, chartConfiguration);
        this.drawDatapoints(canvasContext, chartConfiguration.data.values, chartConfiguration.chartStyle.valueColors, chartConfiguration.chartType);
    }

    /**
     * Draws the Coordinate System
     */
    drawCoordinateSystem = (context, chartConfiguration) => {
        // Context Settings for Coordinate System
        context.strokeStyle = this.rgba(chartConfiguration.chartStyle.mainColor, 1);
        context.fillStyle = this.rgba(chartConfiguration.chartStyle.mainColor, 1);
        context.lineWidth = 1 * this.resizeFactor;
        context.font = 10 * this.resizeFactor + "px " + chartConfiguration.chartStyle.fontFamily;

        // X-Axis
        context.beginPath();
        context.moveTo(this.coordinateSystemSpace.offsets.left, this.getCanvasY(0));
        context.lineTo(this.canvasSpace.width - this.coordinateSystemSpace.offsets.right, this.getCanvasY(0));
        context.stroke();

        // Y-Axis
        context.beginPath();
        context.moveTo(this.coordinateSystemSpace.offsets.left, this.coordinateSystemSpace.offsets.top);
        context.lineTo(this.coordinateSystemSpace.offsets.left, this.canvasSpace.height - this.coordinateSystemSpace.offsets.bottom);
        context.stroke();

        // Context Settings for X-Axis Labels
        context.textAlign = "center";

        // X-Axis Labels
        chartConfiguration.data.keys.forEach((label, index) => {
            let coordinates = this.getCanvasCoordinates(index, 0);
            this.drawXLabel(context, coordinates.x, coordinates.y, label);
        });

        // Context Settings for Y-Axis Labels
        context.textAlign = "right";
        context.textBaseline = "middle";

        // Y-Axis Labels
        for(let i = this.extremeLabels.min; i <= this.extremeLabels.max; i += 1) {
            let coordinates = this.getCanvasCoordinates(0, i);
            this.drawYLabel(context, this.coordinateSystemSpace.offsets.left, coordinates.y, i);
        }
    }

    /**
     * Prints a Warning to the Console if the given Coordinate is out of Bounds
     */
    coordinateOutOfBoundsWarning = (x, y) => {
        if(x < 0 || x > this.canvasSpace.width || y < 0 || y > this.canvasSpace.height) {
            console.warn("Coordinate out of bounds: (" + x + ", " + y + ")");
        }
    }

    /**
     * Calculates the Canvas Coordinates for the nth Datapoint
     */
    getCanvasCoordinates = (nthValue, coordinateSystemY) => {
        const canvasX = this.getCanvasX(nthValue);
        const canvasY = this.getCanvasY(coordinateSystemY);
        return {x: canvasX, y: canvasY};
    }

    /**
     * Calculates the Canvas X-Coordinate for the nth Datapoint
     */
    getCanvasX = (nthValue) => {
        const canvasX = this.dataSpace.offsets.left + nthValue * this.dataSpace.dataSpacing;
        this.coordinateOutOfBoundsWarning(canvasX, 0);
        return canvasX;
    }

    /**
     * Calculates the Canvas Y-Coordinate for the given Coordinate System Y-Coordinate
     */
    getCanvasY = (coordinateSystemY) => {
        let heightPercentage = (coordinateSystemY - this.extremeValues.min) / (this.extremeValues.max - this.extremeValues.min);
        let canvasY = this.dataSpace.offsets.top + (1 - heightPercentage) * this.dataSpace.height;
        this.coordinateOutOfBoundsWarning(0, canvasY);
        return canvasY;
    }

    /**
     * Draws a Label on the X-Axis
     */
    drawXLabel = (context, x, y, label) => {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x, (this.xAxisLabelsBelow ? 5 : -5) * this.resizeFactor + y);
        context.stroke();

        context.beginPath();
        context.fillText(label, x, (this.xAxisLabelsBelow ? SIDE_SPACE / 2 : -SIDE_SPACE / 2) * this.resizeFactor + y, this.dataSpace.dataSpacing);
        context.stroke();
    }

    /**
     * Draws a Label on the Y-Axis
     */
    drawYLabel = (context, x, y, label) => {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - 5 * this.resizeFactor, y);
        context.stroke();

        context.beginPath();
        context.fillText(label, x - 10 * this.resizeFactor, y, this.coordinateSystemSpace.offsets.left - 10);
        context.stroke();
    }

    /**
     * Draws Datapoints of multiple Datasets
     */
    drawDatapoints = (context, datasets, colors, chartType) => {
        datasets.forEach((dataset, datasetIndex) => {
            context.strokeStyle = this.rgba(colors[datasetIndex], 1);
            context.fillStyle = this.rgba(colors[datasetIndex], 0.5);

            dataset.forEach((datapoint, index) => {
                let coordinates = this.getCanvasCoordinates(index, datapoint);
                dataset[index] = coordinates;
                this.drawNode(context, coordinates.x, coordinates.y, chartType);
            });

            this.drawLine(context, dataset, chartType);
        });
    }

    /**
     * Draws a single Datapoint at a specific Position
     */
    drawNode = (context, x, y, chartType) => {
        switch(chartType) {
            case "node":
            case "line":
            case "curve":
                context.beginPath();
                context.arc(x, y, 2.5 * this.resizeFactor, 0, 2 * Math.PI);
                context.stroke();
                context.fill();

                break;
            case "bar":
                context.beginPath();
                context.rect(x - this.dataSpace.dataSpacing / 4, y, this.dataSpace.dataSpacing / 2, this.dataSpace.height - y + this.dataSpace.offsets.top);
                context.stroke();
                context.fill();

                break;
            default:
                console.error("Invalid Chart Type: " + chartType);
        }
    }

    /**
     * Draws either a Line or a Curve between the given Points
     */
    drawLine = (context, points, chartType) => {
        switch(chartType) {
            case "line":
                context.beginPath();
                for(let i = 0; i < points.length - 1; i++) {
                    context.moveTo(points[i].x, points[i].y);
                    context.lineTo(points[i + 1].x, points[i + 1].y);
                }
                context.stroke();
                break;
            case "curve":
                let f = .3;
                let t = .6;
                let m = 0;

                let previousPoint = null;
                let previousDeltaX = 0;
                let previousDeltaY = 0;
                for(let i = 0; i < points.length; i++) {
                    if(i === 0) {
                        previousPoint = points[i];
                        context.moveTo(points[i].x, points[i].y);
                        continue;
                    }

                    let currentPoint = points[i];
                    let nextPoint = points[i + 1];

                    let currentDeltaX = 0;
                    let currentDeltaY = 0;
                    if(nextPoint) {
                        m = (nextPoint.y - previousPoint.x) / (nextPoint.x - previousPoint.x);
                        currentDeltaX = (nextPoint.x - currentPoint.x) * (-f);
                        currentDeltaY = currentDeltaX * m * t;
                    }

                    context.bezierCurveTo(previousPoint.x - previousDeltaX, previousPoint.y - previousDeltaY, currentPoint.x + currentDeltaX, currentPoint.y + currentDeltaY, currentPoint.x, currentPoint.y);

                    previousDeltaX = currentDeltaX;
                    previousDeltaY = currentDeltaY;
                    previousPoint = currentPoint;
                }

                context.stroke();
            break;
        default:
            // No Default Line
            break;
        }
    }

    /**
     * Validates the ChartConfiguration
     */
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

    /**
     * Get RGBA Color with Opacity Aspect
     */
    rgba = (color, opacity) => {
        let alpha = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
        return color + alpha.toString(16).toLowerCase();
    }

}