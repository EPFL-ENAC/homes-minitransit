interface GameArea {
    id: string;
    name: string;
    description: string;
    center: [number, number];
}

export const gameAreas = {
    "lausanne": {
        id: "lausanne",
        name: "Lausanne",
        description: "The beautiful city of Lausanne, Switzerland.",
        center: [6.6323, 46.5197],
    },
    "renens": {
        id: "renens",
        name: "Renens",
        description: "The vibrant town of Renens, near Lausanne.",
        center: [6.5833, 46.5333],
    }
} as const;

export type GameAreaId = keyof typeof gameAreas;