declare module "react-simple-maps" {
  import { ComponentType, CSSProperties, ReactNode, SVGProps } from "react";

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
      rotate?: [number, number, number];
    };
    width?: number;
    height?: number;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
  }
  export const ComposableMap: ComponentType<ComposableMapProps>;

  export interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    onMoveStart?: (event: { coordinates: [number, number]; zoom: number }) => void;
    onMove?: (event: { coordinates: [number, number]; zoom: number }) => void;
    onMoveEnd?: (event: { coordinates: [number, number]; zoom: number }) => void;
    translateExtent?: [[number, number], [number, number]];
    children?: ReactNode;
  }
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;

  export interface GeographiesProps {
    geography: string | object;
    children: (data: { geographies: GeographyType[] }) => ReactNode;
  }
  export const Geographies: ComponentType<GeographiesProps>;

  export interface GeographyType {
    rsmKey: string;
    type: string;
    properties: Record<string, unknown>;
    geometry: object;
  }

  export interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: GeographyType;
    style?: {
      default?: CSSProperties;
      hover?: CSSProperties;
      pressed?: CSSProperties;
    };
  }
  export const Geography: ComponentType<GeographyProps>;

  export interface MarkerProps extends SVGProps<SVGGElement> {
    coordinates: [number, number];
    style?: CSSProperties;
    children?: ReactNode;
  }
  export const Marker: ComponentType<MarkerProps>;

  export interface LineProps {
    coordinates: [number, number][];
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    className?: string;
    style?: CSSProperties;
  }
  export const Line: ComponentType<LineProps>;

  export interface AnnotationProps {
    subject: [number, number];
    dx?: number;
    dy?: number;
    connectorProps?: SVGProps<SVGPathElement>;
    children?: ReactNode;
  }
  export const Annotation: ComponentType<AnnotationProps>;

  export interface GraticuleProps {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    step?: [number, number];
    className?: string;
    style?: CSSProperties;
  }
  export const Graticule: ComponentType<GraticuleProps>;

  export interface SphereProps extends SVGProps<SVGCircleElement> {
    id?: string;
  }
  export const Sphere: ComponentType<SphereProps>;
}
