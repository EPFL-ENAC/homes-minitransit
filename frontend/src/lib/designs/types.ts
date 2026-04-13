
export interface FixedRouteServiceJSON {
    name: string;
    stops: number[];
    frequency: number; // in minutes ?
    capacity: number;
    stopping_time: number; // in minutes ?
    travel_time: number; // in minutes ?
    base_fare?: number;
}

export interface OnDemandServiceJSON {
    name: string;
    type: "docked" | "free-floating";
    capacity: number;
    vehicles: Vehicle[];
    docking_stations: DockingStation[];
    base_fare?: number;
}

export interface Vehicle {
    vehicle_id: string;
    initial_location: number;
    capacity: number;
}

export interface DockingStation {
    station_id: string;
    location: number;
    capacity: number;
}

export interface TransitSystemDesignJSON {
    fixed_route_services: FixedRouteServiceJSON[];
    ondemand_services: OnDemandServiceJSON[];
}