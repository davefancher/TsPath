module TsPath {
    export interface IPathCommand {
        Invoke(context: CanvasRenderingContext2D): void;
    }

    class Point {
        private _xCoordinate: number;
        private _yCoordinate: number;

        get X(): number { return this._xCoordinate; }
        get Y(): number { return this._yCoordinate; }

        constructor(x: number, y: number) {
            this._xCoordinate = x;
            this._yCoordinate = y;
        }
    }

    enum FillRule {
        EvenOdd = 0,
        NonZero = 1
    }

    class FillRuleCommand implements IPathCommand {
        private _fillRule: FillRule;

        get FillRule(): FillRule { return this._fillRule; }

        constructor(rule: FillRule) {
            this._fillRule = rule;
        }

        Invoke(context: CanvasRenderingContext2D) {
            context.msFillRule = this._fillRule === FillRule.EvenOdd ? "evenodd" : "nonzero";
        }
    }

    class MoveToCommand implements IPathCommand {
        private _point: Point;

        get Point(): Point { return this._point; }

        constructor(p: Point) {
            this._point = p;
        }

        Invoke(context: CanvasRenderingContext2D) {
            context.moveTo(this._point.X, this.Point.Y);
        }
    }

    class LineToCommand implements IPathCommand {
        private _point: Point;

        get Point(): Point { return this._point; }

        constructor(p: Point) {
            this._point = p;
        }

        Invoke(context: CanvasRenderingContext2D) {
            context.lineTo(this._point.X, this.Point.Y);
        }
    }

    class CubicBezierCurveCommand implements IPathCommand {
        private _controlPoint1: Point;
        private _controlPoint2: Point;
        private _endPoint: Point;

        get ControlPoint1(): Point { return this._controlPoint1; }
        get ControlPoint2(): Point { return this._controlPoint2; }
        get EndPoint(): Point { return this._endPoint; }

        constructor(cp1: Point, cp2: Point, ep: Point) {
            this._controlPoint1 = cp1;
            this._controlPoint2 = cp2;
            this._endPoint = ep;
        }

        Invoke(context: CanvasRenderingContext2D) {
            context.bezierCurveTo(
                this._controlPoint1.X,
                this._controlPoint1.Y,
                this._controlPoint2.X,
                this._controlPoint2.Y,
                this._endPoint.X,
                this._endPoint.Y);
        }
    }

    class QuadraticBezierCurveCommand implements IPathCommand {
        private _controlPoint: Point;
        private _endPoint: Point;

        get ControlPoint(): Point { return this._controlPoint; }
        get EndPoint(): Point { return this._endPoint; }

        constructor(cp: Point, ep: Point) {
            this._controlPoint = cp;
            this._endPoint = ep;
        }

        Invoke(context: CanvasRenderingContext2D) {
            context.quadraticCurveTo(
                this._controlPoint.X,
                this._controlPoint.Y,
                this._endPoint.X,
                this._endPoint.Y);
        }
    }

    class EllipticalArcCommand implements IPathCommand {
        private _centerPoint: Point;
        private _radius: number;
        private _startAngle: number;
        private _endAngle: number;
        private _counterClockwise: boolean;

        constructor(centerPoint: Point, radius: number, startAngle: number, endAngle: number, counterClockwise: boolean) {
            this._centerPoint = centerPoint;
            this._radius = radius;
            this._startAngle = startAngle;
            this._endAngle = endAngle;
            this._counterClockwise = counterClockwise;
        }

        Invoke(context: CanvasRenderingContext2D) {
            context.arc(
                this._centerPoint.X,
                this._centerPoint.Y,
                this._radius,
                this._startAngle,
                this._endAngle,
                this._counterClockwise);
        }
    }

    class ClosePathCommand implements IPathCommand {
        constructor() {
        }

        Invoke(context: CanvasRenderingContext2D) {
            context.closePath();
        }
    }

    class TextStream {
        private _source: string;
        private _position: number;

        get Current(): string {
            return this._position >= this._source.length ? null : this._source[this._position];
        }

        MoveNext() { return ++this._position < this._source.length; }
        Reset() { this._position = 0; }

        constructor(source: string) {
            this._source = source;
            this.Reset();
        }
    }

    export class PathParser {
        private _wsChars = [" ", "\t"];
        private _commandChars = ["M", "L", "C", "Q", "A", "Z"];

        private IsCommandCharacter(current: string): boolean {
            return this._commandChars.indexOf(current) !== -1;
        }

        private IsWhitespaceCharacter(current: string): boolean {
            return this._wsChars.indexOf(current) !== -1;
        }

        private IsNegativeSign(current: string): boolean {
            return current === "-";
        }

        private IsComma(current: string): boolean {
            return current === ",";
        }

        private IsDecimal(current: string): boolean {
            return current === ".";
        }

        private IsNumber(current: string) {
            return !isNaN(parseInt(current, 10));
        }

        private SkipWhitespace(stream: TextStream) {
            while (this.IsWhitespaceCharacter(stream.Current) && stream.MoveNext()) { }
        }

        private SkipArgumentSeparator(stream: TextStream) {
            this.SkipWhitespace(stream);
            this.SkipComma(stream);
            this.SkipWhitespace(stream);
        }

        private SkipComma(stream: TextStream) {
            if (this.IsComma(stream.Current)) stream.MoveNext();
        }

        private ReadNumber(stream: TextStream): number {
            var numStr = "";

            if (this.IsNegativeSign(stream.Current)) {
                numStr += stream.Current;
                stream.MoveNext();
            }

            if(this.IsNumber(stream.Current)) {
                while (this.IsNumber(stream.Current)) {
                    numStr += stream.Current;
                    stream.MoveNext();
                }
            }

            if (this.IsDecimal(stream.Current)) {
                numStr += stream.Current;
                stream.MoveNext();

                if (this.IsNumber(stream.Current)) {
                    while (this.IsNumber(stream.Current)) {
                        numStr += stream.Current;
                        stream.MoveNext();
                    }

                    if (stream.Current === "E") {
                        numStr += stream.Current;
                        stream.MoveNext();
                        if (this.IsNegativeSign(stream.Current)) {
                            numStr += stream.Current;
                            stream.MoveNext();
                        }

                        if (!this.IsNumber(stream.Current)) throw "Invalid number"
                        while (this.IsNumber(stream.Current)) {
                            numStr += stream.Current;
                            stream.MoveNext();
                        }
                    }
                }
            }

            return Number(numStr);
        }

        private ReadPoint(stream: TextStream): Point {
            var x = this.ReadNumber(stream);
            this.SkipArgumentSeparator(stream);
            var y = this.ReadNumber(stream);

            return new Point(x, y);
        }

        private ParseFillStyleCommand(stream: TextStream): IPathCommand[] {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing fill style command";

            var fillRule: FillRule;

            switch (this.ReadNumber(stream)) {
                case 0:
                    fillRule = FillRule.EvenOdd;
                    break;
                case 1:
                    fillRule = FillRule.NonZero;
                    break;
                default:
                    throw "Invalid fill style option. Valid options are 0 (evenodd) and 1 (nonzero)";
            }

            this.SkipWhitespace(stream);

            return [new FillRuleCommand(fillRule)];
        }

        private ParseMoveToCommand(stream: TextStream): IPathCommand[] {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing move to command";
            this.SkipWhitespace(stream);

            var p = this.ReadPoint(stream);

            this.SkipWhitespace(stream);

            return [new MoveToCommand(p)];
        }

        private ParseLineToCommand(stream: TextStream): IPathCommand[] {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands: IPathCommand[] = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var p = this.ReadPoint(stream);
                this.SkipWhitespace(stream);
                commands.push(new LineToCommand(p));
            }

            return commands;
        }

        private ParseCubicBezierCurveCommand(stream: TextStream): IPathCommand[]{
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands: IPathCommand[] = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var cp1 = this.ReadPoint(stream);
                this.SkipArgumentSeparator(stream);
                var cp2 = this.ReadPoint(stream);
                this.SkipArgumentSeparator(stream);
                var ep = this.ReadPoint(stream);
                this.SkipArgumentSeparator(stream);
                commands.push(new CubicBezierCurveCommand(cp1, cp2, ep));
            }

            return commands;
        }

        private ParseQuadraticBezierCurveInterpreter(stream: TextStream): IPathCommand[] {
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands: IPathCommand[] = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var cp = this.ReadPoint(stream);
                this.SkipArgumentSeparator(stream);
                var ep = this.ReadPoint(stream);
                this.SkipArgumentSeparator(stream);

                commands.push(new QuadraticBezierCurveCommand(cp, ep));
            }

            return commands;
        }

        private ParseEllipticalArcInterpreter(stream: TextStream): IPathCommand[]{
            if (!stream.MoveNext()) throw "Unexpected end of stream while parsing line to command";
            this.SkipWhitespace(stream);

            var commands: IPathCommand[] = [];

            while (!this.IsCommandCharacter(stream.Current) && stream.Current != null) {
                var center = this.ReadPoint(stream);
                this.SkipArgumentSeparator(stream);
                var radius = this.ReadNumber(stream);
                this.SkipArgumentSeparator(stream);
                var startAngle = this.ReadNumber(stream);
                this.SkipArgumentSeparator(stream);
                var endAngle = this.ReadNumber(stream);
                this.SkipArgumentSeparator(stream);
                var ccw = this.ReadNumber(stream) === 1;
                this.SkipArgumentSeparator(stream);
                commands.push(new EllipticalArcCommand(center, radius, startAngle, endAngle, ccw));
            }

            return commands;
        }

        private ParseClosePathCommand(stream: TextStream): IPathCommand[] {
            stream.MoveNext();
            this.SkipWhitespace(stream);

            return [new ClosePathCommand()];
        }

        private ResolveInitialCommand(stream: TextStream): IPathCommand[] {
            this.SkipWhitespace(stream);

            switch (stream.Current) {
                case "F": return this.ParseFillStyleCommand(stream);
                case "M": return this.ParseMoveToCommand(stream);
            }

            throw "Invalid command";
        }

        private ResolveDrawingCommands(stream: TextStream) : IPathCommand[] {
            switch (stream.Current) {
                case "M": return this.ParseMoveToCommand(stream);
                case "L": return this.ParseLineToCommand(stream);
                case "C": return this.ParseCubicBezierCurveCommand(stream);
                case "Q": return this.ParseQuadraticBezierCurveInterpreter(stream);
                case "A": return this.ParseEllipticalArcInterpreter(stream);
                case "Z": return this.ParseClosePathCommand(stream);
            }

            throw "Invalid command";
        }

        Parse(path: string): IPathCommand[]{
            if (path === "") return [];

            var stream = new TextStream(path.toUpperCase());

            var commands: IPathCommand[] = this.ResolveInitialCommand(stream);

            while (true) {
                commands = commands.concat(this.ResolveDrawingCommands(stream));

                if (stream.Current != null && this.IsCommandCharacter(stream.Current)) continue;
                if (!stream.MoveNext()) break;
            }

            return commands;
        }
    }
}

class CanvasExtensions {
    static clearCanvas (canvas : HTMLCanvasElement) {
        var context = canvas.getContext("2d");
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    static drawPath (canvas: HTMLCanvasElement, pathText: string, options?: any) {
        var context = canvas.getContext("2d");

        if (options) {
            context.lineWidth = options.strokeThickness || 1
            context.strokeStyle = options.strokeStyle || "black";
            context.fillStyle = options.fillStyle || "black";
            context.scale(options.scaleX || 1, options.scaleY || 1);
            context.translate(options.translateX || 0, options.translateY || 0);
        } else {
            context.lineWidth = 1;
            context.strokeStyle = "black";
            context.fillStyle = "black";
        }

        context.beginPath();

        (new TsPath.PathParser()).Parse(pathText).forEach(c => c.Invoke(context));

        context.stroke();
        context.fill(context.msFillRule || "evenodd");
    }
}

