import axios, { AxiosInstance } from 'axios';
import { point as Point, polygon, bbox, feature, geometry } from '@turf/turf';
import { BBox, Feature, Polygon, Geometry } from 'geojson';
import { parse as parseDate } from 'date-fns';

// https://github.com/Turfjs/turf/blob/master/packages/turf-bbox/index.ts

const API_URL = "https://m2m.cr.usgs.gov/api/api/json/stable/";

class USGSAuthenticationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "USGSAuthenticationError";
    }
}

class USGSError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "USGSError";
    }
}

class USGSRateLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "USGSRateLimitError";
    }
}

interface APIResponse {
    data?: any;
    errorCode?: string;
    errorMessage?: string;
}

class API {
    private url: string;
    private session: AxiosInstance;

    constructor(username: string, password: string) {
        this.url = API_URL;
        this.session = axios.create();
        // this.login(username, password);
        console.log(this.session.defaults.headers.common['X-Auth-Token'])
    }

    private static raiseApiError(response: APIResponse): void {
        const errorCode = response.errorCode;
        const errorMsg = response.errorMessage;
        if (errorCode) {
            if (["AUTH_INVALID", "AUTH_UNAUTHROIZED", "AUTH_KEY_INVALID"].includes(errorCode)) {
                throw new USGSAuthenticationError(`${errorCode}: ${errorMsg}.`);
            } else if (errorCode === "RATE_LIMIT") {
                throw new USGSRateLimitError(`${errorCode}: ${errorMsg}.`);
            } else {
                throw new USGSError(`${errorCode}: ${errorMsg}.`);
            }
        }
    }

    private async request(endpoint: string, params?: any): Promise<any> {
        const url = new URL(endpoint, this.url).toString();
        const data = JSON.stringify(params);
        
        try {
            const response = await this.session.get(url, { data });
            API.raiseApiError(response.data);
            return response.data.data;
        } catch (error) {
            if (error instanceof USGSRateLimitError) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const retryResponse = await this.session.get(url, { data });
                API.raiseApiError(retryResponse.data);
                return retryResponse.data.data;
            }
            throw error;
        }
    }

    public async login(username: string, password: string): Promise<void> {
        const loginUrl = new URL("login", this.url).toString();
        const payload = { username, password };
        const response = await this.session.post(loginUrl, payload);
        API.raiseApiError(response.data);
        console.log(response.data)
        this.session.defaults.headers.common['X-Auth-Token'] = response.data.data;
        console.log(this.session.defaults.headers.common['X-Auth-Token'])
    }

    public async logout(): Promise<void> {
        await this.request("logout");
        this.session = axios.create();
    }

    public async getEntityId(displayId: string | string[], dataset: string): Promise<string | string[]> {
        const param = Array.isArray(displayId) ? "entityIds" : "entityId";
        const listId = randomString();
        await this.request("scene-list-add", {
            listId,
            datasetName: dataset,
            idField: "displayId",
            [param]: displayId,
        });
        const r = await this.request("scene-list-get", { listId });
        const entityId = r.map((scene: any) => scene.entityId);
        await this.request("scene-list-remove", { listId });
        return Array.isArray(displayId) ? entityId : entityId[0];
    }

    public async metadata(entityId: string, dataset: string, browse: boolean = false): Promise<any> {
        const r = await this.request("scene-metadata", {
            datasetName: dataset,
            entityId: entityId,
            metadataType: "full",
        });
        return parseMetadata(r, browse);
    }

    public async getDisplayId(entityId: string, dataset: string): Promise<string> {
        const meta = await this.metadata(entityId, dataset);
        return meta.display_id;
    }

    public async search(
        dataset: string,
        longitude?: number,
        latitude?: number,
        bbox?: BBox,
        maxCloudCover?: number,
        startDate?: string,
        endDate?: string,
        months?: number[],
        maxResults: number = 100
    ): Promise<any[]> {
        let spatialFilter: SpatialFilterMbr | SpatialFilterGeoJSON | null = null;
        if (longitude !== undefined && latitude !== undefined) {
            const point = Point([longitude, latitude], undefined, {
                bbox
            });
            console.log(point.geometry)
            console.log(bbox)
            spatialFilter = new SpatialFilterGeoJSON(point);
            // spatialFilter = new SpatialFilterMbr(...(point.geometry.bbox as [number, number, number, number]));
        } else if (bbox) {
            spatialFilter = new SpatialFilterMbr(...(bbox as [number, number, number, number]));
        }

        let acquisitionFilter: AcquisitionFilter | null = null;
        if (startDate && endDate) {
            acquisitionFilter = new AcquisitionFilter(startDate, endDate);
        }

        let cloudCoverFilter: CloudCoverFilter | null = null;
        if (maxCloudCover !== undefined) {
            cloudCoverFilter = new CloudCoverFilter(0, maxCloudCover, false);
        }

        const sceneFilter = new SceneFilter(acquisitionFilter!, undefined, /*spatialFilter!,*/ cloudCoverFilter!, undefined, months);

        const r = await this.request("scene-search", {
            datasetName: dataset,
            sceneFilter,
            maxResults,
            metadataType: "full",
        });

        return r.results.map((scene: any) => parseMetadata(scene));
    }
}

function randomString(length: number = 10): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
}

function titleToSnake(srcString: string): string {
    return srcString.toLowerCase().replace(/ /g, '_').replace(/\//g, '-');
}

function camelToSnake(srcString: string): string {
    return srcString.split('').map((char, index) => {
        return char.toLowerCase() === char ? char : (index !== 0 ? '_' : '') + char.toLowerCase();
    }).join('');
}

function toNum(srcString: string | number): number | string {
    if (typeof srcString !== 'string') return srcString;
    srcString = srcString.trim();
    const num = Number(srcString);
    return isNaN(num) ? srcString : num;
}

function toDate(srcString: string | Date): Date | string {
    if (!(srcString instanceof String)) return srcString;
    try {
        return parseDate(srcString as string, "yyyy:DDD:HH:mm:ss.SSSSSS", new Date());
    } catch {
        try {
            return parseDate(srcString as string, "yyyy-MM-dd", new Date());
        } catch {
            return srcString;
        }
    }
}

function parseValue(srcValue: any): any {
    if (typeof srcValue === 'string') {
        srcValue = srcValue.trim();
        srcValue = toNum(srcValue);
        srcValue = toDate(srcValue);
    }
    return srcValue;
}

function parseBrowseMetadata(srcMeta: any[]): any {
    const dstMeta: any = {};
    for (const product of srcMeta) {
        const name = titleToSnake(product.browseName);
        dstMeta[name] = {};
        for (const [field, value] of Object.entries(product)) {
            dstMeta[name][camelToSnake(field)] = value;
        }
    }
    return dstMeta;
}

function parseMetadataField(srcMeta: any[]): any {
    const dstMeta: any = {};
    for (const meta of srcMeta) {
        let name = titleToSnake(meta.fieldName);
        name = name.replace('identifier', 'id');
        if (name === 'date_acquired') name = 'acquisition_date';
        name = name.replace('_l1', '').replace('_l2', '');
        const dictId = meta.dictionaryLink.split('#').pop().trim();
        if (dictId === 'coordinates_degrees') continue;
        if (name === 'entity_id') name = 'sentinel_entity_id';
        if (name.endsWith('_id')) {
            dstMeta[name] = String(meta.value).trim();
        } else {
            dstMeta[name] = parseValue(meta.value);
        }
    }
    return dstMeta;
}

function parseMetadata(response: any, parseBrowseField: boolean = false): any {
    const metadata: any = {};
    for (const [key, value] of Object.entries(response)) {
        const name = camelToSnake(key);
        if (key === 'browse') {
            if (parseBrowseField) {
                metadata[name] = parseBrowseMetadata(value as any[]);
            }
        } else if (key === 'spatialCoverage') {
            metadata[name] = value as Feature<Polygon>;
        } else if (key === 'spatialBounds') {
            metadata[name] = (value as Feature<Polygon>).bbox;
        } else if (key === 'temporalCoverage') {
            const { endDate, startDate } = value as { endDate: string, startDate: string };
            metadata[name] = [toDate(startDate), toDate(endDate)];
        } else if (key === 'metadata') {
            Object.assign(metadata, parseMetadataField(value as any[]));
        } else {
            if (name.endsWith('_id')) {
                metadata[name] = String(value).trim();
            } else {
                metadata[name] = parseValue(value);
            }
        }
    }
    if (!('acquisition_date' in metadata)) {
        metadata['acquisition_date'] = metadata['temporal_coverage'][0];
    }
    return metadata;
}

class Coordinate {
    longitude: number;
    latitude: number;

    constructor(longitude: number, latitude: number) {
        this.longitude = longitude;
        this.latitude = latitude;
    }
}

class GeoJson {
    type: string;
    coordinates: any;

    constructor(shape: Feature<Geometry>) {
        this.type = shape.geometry.type;
        // Note: Property 'coordinates' does not exist on type 'GeometryCollection<Geometry>'
        this.coordinates = this.transform(shape.geometry.type, (shape.geometry as any).coordinates);
    }

    private transform(type: string, coordinates: any): any {
        switch (type) {
            case "MultiPolygon":
                return coordinates[0].map((polygon: number[][]) => 
                    polygon.map((point: number[]) => new Coordinate(point[0], point[1]))
                );
            case "Polygon":
                return coordinates[0].map((point: number[]) => new Coordinate(point[0], point[1]));
            case "LineString":
                return coordinates.map((point: number[]) => new Coordinate(point[0], point[1]));
            case "Point":
                return new Coordinate(coordinates[0], coordinates[1]);
            default:
                throw new Error(`Geometry type '${type}' not supported.`);
        }
    }
}

class SpatialFilterMbr {
    filterType: string = "mbr";
    lowerLeft: Coordinate;
    upperRight: Coordinate;

    constructor(xmin: number, ymin: number, xmax: number, ymax: number) {
        this.lowerLeft = new Coordinate(xmin, ymin);
        this.upperRight = new Coordinate(xmax, ymax);
    }
}

class SpatialFilterGeoJSON {
    filterType: string = "geoJson";
    geoJson: GeoJson;

    constructor(shape: Feature<Geometry>) {
        this.geoJson = new GeoJson(shape);
    }
}

class AcquisitionFilter {
    start: string;
    end: string;

    constructor(start: string, end: string) {
        this.start = start;
        this.end = end;
    }
}

class CloudCoverFilter {
    min: number;
    max: number;
    includeUnknown: boolean;

    constructor(min: number = 0, max: number = 100, includeUnknown: boolean = false) {
        this.min = min;
        this.max = max;
        this.includeUnknown = includeUnknown;
    }
}

class MetadataValue {
    filterType: string = "value";
    filterId: string;
    value: string | number;
    operand: string;

    constructor(fieldId: string, value: string | number) {
        this.filterId = fieldId;
        this.value = value;
        this.operand = typeof value === 'string' ? "like" : "=";
    }
}

class SceneFilter {
    acquisitionFilter?: AcquisitionFilter;
    spatialFilter?: SpatialFilterMbr | SpatialFilterGeoJSON;
    cloudCoverFilter?: CloudCoverFilter;
    metadataFilter?: MetadataValue;
    seasonalFilter?: number[];

    constructor(
        acquisitionFilter?: AcquisitionFilter,
        spatialFilter?: SpatialFilterMbr | SpatialFilterGeoJSON,
        cloudCoverFilter?: CloudCoverFilter,
        metadataFilter?: MetadataValue,
        months?: number[]
    ) {
        if (acquisitionFilter) this.acquisitionFilter = acquisitionFilter;
        if (spatialFilter) this.spatialFilter = spatialFilter;
        if (cloudCoverFilter) this.cloudCoverFilter = cloudCoverFilter;
        if (metadataFilter) this.metadataFilter = metadataFilter;
        if (months) this.seasonalFilter = months;
    }
}

export { 
    API, 
    USGSAuthenticationError, 
    USGSError, 
    USGSRateLimitError,
    Coordinate,
    GeoJson,
    SpatialFilterMbr,
    SpatialFilterGeoJSON,
    AcquisitionFilter,
    CloudCoverFilter,
    MetadataValue,
    SceneFilter
};