export type WorkLocationInput = {
  id?: string;
  name: string;
  latitude?: string | null;
  longitude?: string | null;
  isDeleted?: boolean;
};

export type CreateSubtypeBody = {
  name: string;
  hoursPobPheOses?: number | null;
  hoursPobContractor?: number | null;
  target?: number | null;
  location?: string | null;
  autoCalculateManhours?: boolean | null;
  workLocations?: WorkLocationInput[];
};