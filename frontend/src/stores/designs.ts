import { defineStore } from "pinia";
import { ref, watch, watchEffect } from "vue";

export interface FixedRouteService {
    name: string;
    stops: number[];
    frequency: number; // in minutes ?
    capacity: number;
    stopping_time: number; // in minutes ?
    travel_time: number; // in minutes ?
}

export interface TransitSystemDesign {
    fixedRouteServices: FixedRouteService[];
}


export const useDesignsStore = defineStore("designs", () => {
    const file = ref(null);
    const selectedDesign = ref<TransitSystemDesign | null>(null); 
    
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
        const asString = fileReader.result as string;
        const asJson = JSON.parse(asString);
        
        selectedDesign.value = {
            fixedRouteServices: asJson.services
        };
    };

    watch(file, () => {
        if (!file.value) {
            selectedDesign.value = null;
            return;
        }

        fileReader.abort();
        fileReader.readAsText(file.value);
    })

    return {
        file,
        selectedDesign
    };
});