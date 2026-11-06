import type { WreathProduct } from "./types";

/**
 * Demo catalogue. The images are drawn placeholders: replace each `src` with
 * your own transparent-background wreath photo.
 * `imageUrl` turns a file name into a URL, so the Next.js demo and the
 * single-file preview can share this list.
 */
export function makeDemoProducts(imageUrl: (file: string) => string): WreathProduct[] {
  return [
    {
      id: "noble-fir",
      title: "Noble Fir & Winterberry",
      price: 168,
      description: "Hand-tied noble fir with red winterberry, pine cones and a velvet bow. About 60cm across.",
      image: { src: imageUrl("placeholder-noble-fir.svg"), alt: "Placeholder: fir wreath with red berries and a red bow", hangPoint: 0.07 },
    },
    {
      id: "eucalyptus",
      title: "Silver Dollar Eucalyptus Hoop",
      price: 142,
      description: "Preserved eucalyptus on a brushed brass hoop, finished with white seed pods. Lasts for years indoors or under cover.",
      image: { src: imageUrl("placeholder-eucalyptus.svg"), alt: "Placeholder: half eucalyptus wreath on a brass ring", hangPoint: 0.16 },
    },
    {
      id: "citrus",
      title: "Dried Citrus & Cedar",
      price: 154,
      description: "Cedar and pine with hand-dried orange slices, cones and rosehip. Smells of the season.",
      image: { src: imageUrl("placeholder-citrus.svg"), alt: "Placeholder: green wreath with dried orange slices and cones", hangPoint: 0.07 },
    },
    {
      id: "frosted-cedar",
      title: "Frosted Cedar, Ivory Ribbon",
      price: 186,
      description: "Silvered cedar and white pine with ivory berries and a silk ribbon. Quiet and bright on a dark door.",
      image: { src: imageUrl("placeholder-frosted-cedar.svg"), alt: "Placeholder: pale frosted wreath with an ivory bow", hangPoint: 0.07 },
    },
  ];
}
