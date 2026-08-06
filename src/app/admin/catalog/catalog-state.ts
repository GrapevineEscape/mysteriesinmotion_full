export type CatalogState = {
  errors: string[];
  saved: boolean;
};

export const emptyCatalogState: CatalogState = { errors: [], saved: false };
