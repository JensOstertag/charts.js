const RESIZE_FACTOR = 5;

const SIDE_SPACE = 50;
const SAFE_AREA = 30;

const LABELS_PER_100_PIXELS = 2;

const RESIZE_LISTENERS = [];

class Chart {
    resizeFactor = RESIZE_FACTOR;
    resize = (value) => {
        return value * this.resizeFactor;
    }
    reverseResize = (value) => {
        return value / this.resizeFactor;
    }
    labelsPer100Pixels = LABELS_PER_100_PIXELS;
    /*
        Measurement Overview

        Canvas Border
        ████████████████████████████████████████████████████████████████████████████
        █   Coordinate System Border        ↕ A                                    █
        █   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   █
        █   ▓   Graph Data Border           C ↕                     ↑          ▓   █
        █   ▓   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   ▓   █
        █   ▓   ░          ↑                                        |      ░   ▓   █
        █   ▓←--░----------+---------------- E ---------------------+------░--→▓   █
        █   ▓   ░          |                                        |      ░   ▓   █
        █   ▓   ░          |                                        |      ░   ▓   █
        █←B→▓←D→░          H                                        G      ░←D→▓←B→█
        █   ▓   ░          |                                        |      ░   ▓   █
        █   ▓   ░          |                                        |      ░   ▓   █
        █   ▓   ░←---------+---------------- F ---------------------+-----→░   ▓   █
        █   ▓   ░          ↓                                        |      ░   ▓   █
        █   ▓   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   ▓   █
        █   ▓                               C ↕                     ↓          ▓   █
        █   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   █
        █                                   ↕ A                                    █
        ████████████████████████████████████████████████████████████████████████████
    */
    // The Dimensions below are given in Canvas Pixels
    dimensions = {
        canvas: {
            width: 0,
            height: 0
        },
        coordinateSystem: {
            width: 0, // E
            height: 0, // G
            // Extra Space at the Top, Bottom and on the Left and Right of the first / last Coordinate System Label
            // It is included in the Coordinate System Width and Height
            safeArea: 0,
            offsets: {
                lr: 0, // B
                tb: 0 // A
            }
        },
        chartData: {
            width: 0, // F
            height: 0, // H
            offsets: {
                lr: 0, // D
                tb: 0 // C
            }
        }
    };
    data = {
        spacing: 0,
        extremeValues: {
            min: 0,
            max: 0
        },
        labels: {
            min: 0,
            max: 0,
            spacing: 0,
            spacingDecimals: 0,
        }
    };
    chartType = "";
    alpha = 0;

    /**
     * Creates a new Chart with the given ChartConfiguration
     * @param {Array} chartConfiguration Chart Configuration
     * @returns {void}
     */
    create = (chartConfiguration) => {
        if(!(this.validateConfiguration(chartConfiguration))) {
            throw "ChartConfiguration invalid";
        }

        this.chartType = chartConfiguration.chartType;

        let chartCanvas = document.getElementById(chartConfiguration.htmlElementId);
        let canvasContext = chartCanvas.getContext("2d");

        // Reduce the Resize Factor if the Canvas is too big
        let width = this.resize(chartCanvas.clientWidth), height = this.resize(chartCanvas.clientHeight);
        // Maximum Size for a Canvas Element on IE 11
        let maxWidth = 8192, maxHeight = 8192;
        if(width > maxWidth) {
            this.resizeFactor *= maxWidth / width;
            width = this.resize(chartCanvas.clientWidth), height = this.resize(chartCanvas.clientHeight);
        }
        if(height > maxHeight) {
            this.resizeFactor *= maxHeight / height;
            width = this.resize(chartCanvas.clientWidth), height = this.resize(chartCanvas.clientHeight);
        }

        // Set the Size of the Canvas to the ClientSize of the HTML Element
        chartCanvas.width = this.resize(chartCanvas.clientWidth);
        chartCanvas.height = this.resize(chartCanvas.clientHeight);

        // Read the Min and Max Values from the Data
        chartConfiguration.data.values.forEach(dataset => {
            dataset.forEach(value => {
                if(value > this.data.extremeValues.max) {
                    this.data.extremeValues.max = value;
                }

                if(value < this.data.extremeValues.min) {
                    this.data.extremeValues.min = value;
                }
            });
        });

        // Fill the Dimensions Object with the correct Values
        this.dimensions.canvas.width = chartCanvas.width;
        this.dimensions.canvas.height = chartCanvas.height;

        this.dimensions.coordinateSystem.offsets.lr = this.resize(SIDE_SPACE);
        this.dimensions.coordinateSystem.offsets.tb = 0;
        this.dimensions.coordinateSystem.safeArea = this.resize(SAFE_AREA);
        this.dimensions.coordinateSystem.width = this.dimensions.canvas.width - this.dimensions.coordinateSystem.offsets.lr * 2;
        this.dimensions.coordinateSystem.height = this.dimensions.canvas.height - this.dimensions.coordinateSystem.offsets.tb * 2;

        this.dimensions.chartData.offsets.lr = this.dimensions.coordinateSystem.safeArea;
        this.dimensions.chartData.offsets.tb = this.dimensions.coordinateSystem.safeArea;
        this.dimensions.chartData.width = this.dimensions.coordinateSystem.width - this.dimensions.chartData.offsets.lr * 2;
        this.dimensions.chartData.height = this.dimensions.coordinateSystem.height - this.dimensions.chartData.offsets.tb * 2;
        
        // Generate Scale for X Acis
        this.data.spacing = this.calculateXLabelDistance(chartConfiguration);

        // Generate Scale for Y Axis
        this.data.labels.spacing = this.calculateYLabelDistance();
        if(this.data.labels.spacing < 1) {
            let decimals = 0;
            let temp = this.data.labels.spacing;
            while(temp <= 10) {
                decimals++;
                temp *= 10;

                if(decimals > 10) {
                    decimals = 10;
                }
            }
            this.data.labels.spacingDecimals = decimals;
        }
        this.data.labels.min = 0;
        this.data.labels.max = 0;
        while(this.data.labels.min > this.data.extremeValues.min) {
            this.data.labels.min -= this.data.labels.spacing;
        }
        while(this.data.labels.max < this.data.extremeValues.max) {
            this.data.labels.max += this.data.labels.spacing;
        }

        console.log("create");

        // Handle Resizes
        let resize = () => {
            this.create(chartConfiguration);
        }
        if(RESIZE_LISTENERS[chartConfiguration.htmlElementId] !== true) {
            window.addEventListener("resize", resize);
            RESIZE_LISTENERS[chartConfiguration.htmlElementId] = true;
        }

        this.draw(canvasContext, chartConfiguration);
        let update = setInterval(() => {
            if(this.alpha >= 1) {
                clearInterval(update);
                return;
            }
            this.draw(canvasContext, chartConfiguration);
            this.alpha = Math.min(1, this.alpha + .1);
        }, 30);
    }

    /**
     * (Re-)draws the Chart
     * @param {CanvasRenderingContext2D} context Canvas Context
     * @param {Array} chartConfiguration Chart Configuration
     * @returns {void}
     */
    draw = (context, chartConfiguration) => {
        // Clear the Canvas
        context.clearRect(0, 0, this.dimensions.canvas.width, this.dimensions.canvas.height);

        // Draw the Coordinate System
        this.drawCoordinateSystem(context, chartConfiguration);

        // Draw the Data
        this.drawData(context, chartConfiguration);
    }

    /**
     * Draws the Coordinate System (X and Y Axis with Labels)
     * @param {CanvasRenderingContext2D} context Canvas Context
     * @param {Array} chartConfiguration Chart Configuration
     * @returns {void}
     */
    drawCoordinateSystem = (context, chartConfiguration) => {
        // Context Settings for Coordinate System
        context.strokeStyle = this.rgba(chartConfiguration.chartStyle.mainColor, 1);
        context.fillStyle = this.rgba(chartConfiguration.chartStyle.mainColor, 1);
        context.lineWidth = this.resize(chartConfiguration.chartStyle.strokeWidth.coordinateSystem);
        context.font = this.resize(20) + "px " + chartConfiguration.chartStyle.fontFamily;

        // X-Axis
        context.beginPath();
        context.moveTo(this.dimensions.coordinateSystem.offsets.lr, this.translateYCoordinate(0));
        context.lineTo(this.dimensions.canvas.width - this.dimensions.coordinateSystem.offsets.lr, this.translateYCoordinate(0));
        context.stroke();

        // Y-Axis
        context.beginPath();
        let fromY = this.dimensions.canvas.height - this.dimensions.coordinateSystem.offsets.tb, toY = this.dimensions.coordinateSystem.offsets.tb;
        if(this.data.extremeValues.min <= 0 && this.data.extremeValues.max <= 0) {
            toY += this.dimensions.coordinateSystem.safeArea;
        }
        if(this.data.extremeValues.min >= 0 && this.data.extremeValues.max >= 0) {
            fromY -= this.dimensions.coordinateSystem.safeArea;
        }
        context.moveTo(this.dimensions.coordinateSystem.offsets.lr, fromY);
        context.lineTo(this.dimensions.coordinateSystem.offsets.lr, toY);
        context.stroke();

        // X-Axis Labels
        let endOfLastLabel = null;
        for(let i = 0; i < chartConfiguration.data.keys.length; i++) {
            // Omit Label if it overlaps the previous one
            let x = this.translateXCoordinate(i);
            let labelWidth = context.measureText(chartConfiguration.data.keys[i]).width;
            if(endOfLastLabel !== null && x - labelWidth / 2 - this.dimensions.coordinateSystem.safeArea / 2 < endOfLastLabel) {
                continue;
            }
            endOfLastLabel = x + labelWidth / 2;

            // Small Dash
            context.beginPath();
            context.moveTo(this.translateXCoordinate(i), this.translateYCoordinate(0));
            if(this.data.extremeValues.min <= 0 && this.data.extremeValues.max <= 0) {
                context.lineTo(this.translateXCoordinate(i), this.translateYCoordinate(0) - this.resize(10));
            } else {
                context.lineTo(this.translateXCoordinate(i), this.translateYCoordinate(0) + this.resize(10));
            }
            context.stroke();

            // Label
            let y = this.translateYCoordinate(0) + this.resize(10) + this.resize(20);
            if(this.data.extremeValues.min <= 0 && this.data.extremeValues.max <= 0) {
                y = this.translateYCoordinate(0) - this.resize(10);
            }
            context.fillText(chartConfiguration.data.keys[i], this.translateXCoordinate(i) - labelWidth / 2, y);
        }

        // Y-Axis Labels
        for(let label = this.data.labels.min; label <= this.data.labels.max; label += this.data.labels.spacing) {
            // Small Dash
            context.beginPath();
            context.moveTo(this.dimensions.coordinateSystem.offsets.lr, this.translateYCoordinate(label));
            context.lineTo(this.dimensions.coordinateSystem.offsets.lr - this.resize(10), this.translateYCoordinate(label));
            context.stroke();

            // Label
            let labelString = label.toFixed(this.data.labels.spacingDecimals);
            context.fillText(labelString, this.dimensions.coordinateSystem.offsets.lr - this.resize(10) - context.measureText(labelString).width, this.translateYCoordinate(label) + this.resize(6.25));
        }
    }

    /**
     * Draws the Data Points
     * @param {CanvasRenderingContext2D} context Canvas Context
     * @param {Array} chartConfiguration Chart Configuration
     * @returns {void}
     */
    drawData = (context, chartConfiguration) => {
        context.lineWidth = this.resize(chartConfiguration.chartStyle.strokeWidth.charts);
        this.drawDatapoints(context, chartConfiguration.data.values, chartConfiguration.chartStyle.valueColors, chartConfiguration.chartType);
    }

    /**
     * Calculates the Distance between two X-Axis Labels
     * @param {Number} chartConfiguration 
     * @returns {Number} Distance between two X-Axis Labels
     */
    calculateXLabelDistance = (chartConfiguration) => {
        let width = this.dimensions.chartData.width;
        let labels = chartConfiguration.data.keys.length;
        if(chartConfiguration.chartType === "bar") {
            labels += .5;
        }
        let labelDistance = width / (labels - 1);
        return labelDistance;
    }

    /**
     * Calculates the Distance between two Y-Axis Labels
     * @returns {Number} Distance between two Y-Axis Labels
     */
    calculateYLabelDistance = () => {
        let extrema = Math.max(Math.abs(this.data.extremeValues.min), Math.abs(this.data.extremeValues.max));
        let height = this.reverseResize(this.dimensions.chartData.height);

        // Use relative Size of the Quadrant to calculate the amount of Labels that should be used for it
        let yScaleHeight = Math.abs(this.data.extremeValues.min) + Math.abs(this.data.extremeValues.max);
        if(this.data.extremeValues.min <= 0 && this.data.extremeValues.max <= 0) {
            yScaleHeight = Math.max(extrema, Math.abs(this.data.extremeValues.min));
        } else if(this.data.extremeValues.min >= 0 && this.data.extremeValues.max >= 0) {
            yScaleHeight = Math.max(extrema, Math.abs(this.data.extremeValues.max));
        }
        let relativeIntervalSize = extrema / yScaleHeight;
        height *= relativeIntervalSize;

        let labels = this.labelsPer100Pixels * (height / 100);
        let labelDistance = extrema / labels;
        return this.beautifyNumber(labelDistance);
    }

    /**
     * Beautifies a Number to a more Human-readable Number
     * @param {Number} number 
     * @returns {Number} Beatified Number
     */
    beautifyNumber = (number) => {
        if(number >= 1 && number < 10) {
            // Round up to 1, 2, 5 or 10
            if(number <= 1)
                number = 1;
            else if(number < 2)
                number = 2;
            else if(number < 5)
                number = 5;
            else if(number < 10)
                number = 10;
            return number;
        }
        
        if(number >= 10 && number < 100) {
            // Round up to next tenth Place
            number = Math.ceil(number / 10) * 10;
            return number;
        }
        
        if(number >= 100 || number < 1) {
            // Round up to the second largest Digit
            let largestExponent = Math.pow(10, Math.floor(Math.log10(number)) - 1);
            number = Math.ceil(number / largestExponent) * largestExponent;
            
            // Check whether the second Digit is 0 or 5
            let secondDigit = Math.floor(number / largestExponent) % 10;
            if(secondDigit !== 0 && secondDigit !== 5) {
                number = number + Math.min(10 - secondDigit, 5 - secondDigit) * largestExponent;
            }

            // Don't go over .5
            if(number > .5) {
                number = 1;
            }
            
            return number;
        }
    }

    /**
     * Translates an X Coordinate of the Chart Data to a X Coordinate of the Canvas
     * @param {Number} nthValue n-th Value of the Chart Data
     * @returns {Number} Canvas X Coordinate
     */
    translateXCoordinate = (nthValue) => {
        let offset = this.dimensions.chartData.offsets.lr + this.dimensions.coordinateSystem.offsets.lr;
        if(this.chartType === "bar") {
            nthValue += .25;
        }
        let xCoordinate = offset + this.data.spacing * nthValue;
        return xCoordinate;
    }

    /**
     * Translates a Y Coordinate of the Chart Data to a Y Coordinate of the Canvas
     * @param {Number} y Y Coordinate in the Coordinate System
     * @returns {Number} Canvas Y Coordinate
     */
    translateYCoordinate = (y) => {
        let min = this.data.labels.min, max = this.data.labels.max;
        let height = this.dimensions.chartData.height;
        let offset = this.dimensions.chartData.offsets.tb + this.dimensions.coordinateSystem.offsets.tb;
        let heightPercentage = (y - min) / (max - min);
        let yCoordinate = offset + height * (1 - heightPercentage);
        return yCoordinate;
    }

    /**
     * Translates X and Y Coordinates of the Chart Data to X and Y Coordinates of the Canvas
     * @param {Number} nthValue n-th Value of the Chart Data
     * @param {Number} datapoint Y Coordinate in the Coordinate System
     * @returns {Object} Object with X and Y Coordinates of the Canvas
     */
    getCanvasCoordinates = (nthValue, datapoint) => {
        let x = this.translateXCoordinate(nthValue);
        let y = this.translateYCoordinate(datapoint);
        return {x: x, y: y};
    }

    /**
     * Draws Datapoints of multiple Datasets
     * @param {CanvasRenderingContext2D} context Canvas Context
     * @param {Array} datasets Datasets
     * @param {Array} colors Colors of the Datasets
     * @returns {void}
     */
    drawDatapoints = (context, datasets, colors) => {
        datasets.forEach((dataset, datasetIndex) => {
            context.strokeStyle = this.rgba(colors[datasetIndex], 1 * this.alpha);
            context.fillStyle = this.rgba(colors[datasetIndex], .5 * this.alpha);

            let datasetCoordinates = [];

            dataset.forEach((datapoint, index) => {
                let coordinates = this.getCanvasCoordinates(index, datapoint);
                datasetCoordinates.push(coordinates);
                this.drawNode(context, coordinates.x, coordinates.y);
            });

            this.drawLine(context, datasetCoordinates);
        });
    }

    /**
     * Draws a single Datapoint at a specific Position
     * @param {CanvasRenderingContext2D} context Canvas Context
     * @param {Number} x X Coordinate of the Canvas
     * @param {Number} y Y Coordinate of the Canvas
     * @returns {void}
     */
    drawNode = (context, x, y) => {
        switch(this.chartType) {
            case "node":
            case "node-line":
            case "node-curve":
                context.beginPath();
                context.arc(x, y, this.resize(2.5), 0, 2 * Math.PI);
                context.stroke();
                context.fill();

                break;
            case "bar":
                let barWidth = this.data.spacing / 2;
                let barHeight = y - this.translateYCoordinate(0);

                context.beginPath();
                context.rect(x - barWidth / 2, y, barWidth, -barHeight);
                context.stroke();
                context.fill();

                break;
            case "line":
            case "curve":
                // No Nodes
                break;
            default:
                console.error("Invalid Chart Type: " + this.chartType);
        }
    }

    /**
     * Draws either a Line or a Curve between the given Points
     * @param {CanvasRenderingContext2D} context Canvas Context
     * @param {Array} points Array of Datapoints with their X and Y Coordinates of the Canvas
     * @returns {void}
     */
    drawLine = (context, points) => {
        switch(this.chartType) {
            case "line":
            case "node-line":
                context.beginPath();
                for(let i = 0; i < points.length - 1; i++) {
                    context.moveTo(points[i].x, points[i].y);
                    context.lineTo(points[i + 1].x, points[i + 1].y);
                }
                context.stroke();
                break;
            case "curve":
            case "node-curve":
                let f = .3;
                let t = .6;
                let m = 0;

                context.beginPath();

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
     * @param {Array} chartConfiguration ChartConfiguration
     * @returns {Boolean} True if the ChartConfiguration is valid, otherwise false
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
        if(!(chartStyleProperty.hasOwnProperty("mainColor") && chartStyleProperty.hasOwnProperty("valueColors") && chartStyleProperty.hasOwnProperty("strokeWidth") && chartStyleProperty.hasOwnProperty("fontFamily"))) {
            console.error("ChartConfiguration requires a ChartStyle property with a MainColor, ValuesColor, StrokeStyle and FontFamily property");
            return false;
        }

        let valueColors = chartStyleProperty.valueColors;
        if(!(valueColors.length === values.length)) {
            console.error("ChartConfigiration requires the same amount of ValueColors as Datasets");
            return false;
        }

        let strokeWidth = chartStyleProperty.strokeWidth;
        if(!(strokeWidth.hasOwnProperty("charts") && strokeWidth.hasOwnProperty("coordinateSystem"))) {
            console.error("ChartConfiguration requires a StrokeWidth property with a Charts and CoordinateSystem property");
            return false;
        }

        return true;
    }

    /**
     * Get RGBA Color with Opacity Aspect
     * @param {String} color Hex Color
     * @param {Number} opacity Opacity
     * @returns {String} RGBA Color
     */
    rgba = (color, opacity) => {
        let alpha = Math.round(Math.min(Math.max(opacity != null ? opacity : 1, 0), 1) * 255);
        let hex = alpha.toString(16).toLowerCase();
        if(hex.length < 2) {
            hex = "0" + hex;
        }
        return color + hex;
    }
}
