import { defineStore } from "pinia";
import { TransitSystemDesign } from "src/lib/designs/transitSystemDesign";
import { ref, watch } from "vue";

export const useDesignsStore = defineStore("designs", () => {
    const file = ref(null);
    const selectedDesign = ref<TransitSystemDesign | null>(null);

    const fileReader = new FileReader();
    fileReader.onload = () => {
        const asString = fileReader.result as string;
        const asJson = JSON.parse(asString);

        selectedDesign.value = TransitSystemDesign.fromJSON(asJson);
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