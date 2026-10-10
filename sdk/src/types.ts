/**
 * Shape of a DrugRep engine run export. The demo fixture in
 * engine-bridge/fixtures follows it; the real engine API will return the same.
 */
export interface RunExport {
  demo: boolean;
  notice?: string;
  run_id: string;
  created_at: string;
  model: { name: string; version: string; config: Record<string, unknown> };
  inputs: Record<string, unknown>;
  layer1: { drugs: DrugLayerEntry[] };
  layer2: { diseases: DiseaseLayerEntry[] };
  layer3: { top_k: number; predictions: Prediction[] };
}

export interface Motif {
  id: string;
  name: string;
  smarts?: string;
}

export interface BindingScore {
  uniprot: string;
  gene: string;
  score: number;
}

export interface MotifResiduePair {
  motif: string;
  protein: string;
  residue: string;
  interaction: string;
}

export interface DrugLayerEntry {
  drugbank_id: string;
  name: string;
  motifs: Motif[];
  binding: BindingScore[];
  motif_residue_pairs: MotifResiduePair[];
}

export interface DiseaseLayerEntry {
  primekg_id: string;
  name: string;
  signature: { uniprot: string; gene: string; weight: number }[];
}

export interface PathStep {
  uniprot: string;
  gene: string;
  role: string;
}

export interface Prediction {
  rank: number;
  drugbank_id: string;
  drug_name: string;
  primekg_id: string;
  disease_name: string;
  score: number;
  protein_path: PathStep[];
  motif_residue_pairs: MotifResiduePair[];
}

/** One private lab record: a drug-disease pair and whether it was confirmed. */
export interface LabRecord {
  drugbank_id: string;
  primekg_id: string;
  outcome: 0 | 1;
  label?: string;
}
