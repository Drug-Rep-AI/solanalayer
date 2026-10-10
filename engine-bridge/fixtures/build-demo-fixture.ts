/**
 * Generates fixtures/demo-run.json and fixtures/demo-lab-records.json.
 *
 * DEMO DATA. Everything here is hand written to have the shape of a DrugRep
 * engine export. Scores are illustrative, not model output. Lab outcomes are
 * simulated from well known public repurposing stories, not trial data.
 * Disease IDs follow the PrimeKG (MONDO grouped) style but are not tied to a
 * specific PrimeKG release.
 *
 * usage: tsx fixtures/build-demo-fixture.ts
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LabRecord, RunExport } from "@drugrep/sdk";

const here = dirname(fileURLToPath(import.meta.url));
const NOTICE =
  "DEMO DATA. Illustrative fixture shaped like a DrugRep engine export. Not real model output and not real trial data.";

const P: Record<string, string> = {
  PDE5A: "O76074", PRKG1: "Q13976", NOS3: "P29474", EDNRA: "P25101", BMPR2: "Q13873",
  ADRB2: "P07550", VEGFA: "P15692", CRBN: "Q96SW2", IKZF1: "Q13422", IKZF3: "Q9UKT9",
  KCNJ8: "Q15842", ABCC9: "O60706", AR: "P10275", SRD5A2: "P31213", JAK1: "P23458",
  JAK2: "O60674", AAK1: "Q2M2I8", IL6: "P05231", SLC5A2: "P31639", NPPB: "P16860",
  GRIN2B: "Q13224", GRIN1: "Q05586", BDNF: "P23560", TUBB: "P07437", NLRP3: "Q96P20",
  IL1B: "P01584", SLC6A4: "P31645", SLC6A2: "P23975", AGTR1: "P30556", TGFB1: "P01137",
  FBN1: "P35555", PRKAA1: "Q13131", MTOR: "P42345", ESR1: "P03372", TLR7: "Q9NYK1",
  ACE2: "Q9BYF1", SMO: "Q99835", PTCH1: "Q13635", GLI1: "P08151", DRD2: "P14416",
  SNCA: "P37840", NFE2L2: "Q16236", KEAP1: "Q14145", IL23A: "Q9NPF7", PTGS2: "P35354",
  APC: "P25054", HMGCR: "P04035", CACNA2D1: "P54289", SCN9A: "Q15858", TNF: "P01375",
};
const prot = (gene: string) => ({ uniprot: P[gene], gene });

// drugbank id, name, motifs [id, name], binding [gene, score], motif-residue [motif, gene, residue, interaction]
type DrugRow = [string, string, [string, string][], [string, number][], [string, string, string, string][]];
const DRUGS: DrugRow[] = [
  ["DB00203", "Sildenafil",
    [["M-PZP", "pyrazolopyrimidinone core"], ["M-MPS", "methylpiperazine sulfonyl"]],
    [["PDE5A", 0.95], ["PRKG1", 0.41], ["NOS3", 0.22]],
    [["M-PZP", "PDE5A", "Gln817", "hydrogen bond"], ["M-PZP", "PDE5A", "Phe820", "pi stacking"], ["M-MPS", "PDE5A", "Leu765", "hydrophobic"]]],
  ["DB00820", "Tadalafil",
    [["M-BCB", "beta carboline"], ["M-BDO", "benzodioxole"]],
    [["PDE5A", 0.93], ["PRKG1", 0.38]],
    [["M-BCB", "PDE5A", "Gln817", "hydrogen bond"], ["M-BDO", "PDE5A", "Phe820", "pi stacking"]]],
  ["DB00571", "Propranolol",
    [["M-NAP", "naphthyloxy"], ["M-IPA", "isopropylamino propanol"]],
    [["ADRB2", 0.91], ["VEGFA", 0.18]],
    [["M-IPA", "ADRB2", "Asp113", "salt bridge"], ["M-IPA", "ADRB2", "Asn312", "hydrogen bond"]]],
  ["DB01041", "Thalidomide",
    [["M-GLU", "glutarimide"], ["M-PHT", "phthalimide"]],
    [["CRBN", 0.92], ["IKZF1", 0.35], ["IKZF3", 0.33]],
    [["M-GLU", "CRBN", "Trp380", "hydrophobic cage"], ["M-GLU", "CRBN", "His378", "hydrogen bond"]]],
  ["DB00350", "Minoxidil",
    [["M-PYO", "pyrimidine N oxide"], ["M-PIP", "piperidinyl"]],
    [["KCNJ8", 0.84], ["ABCC9", 0.8]],
    [["M-PYO", "ABCC9", "Arg1300", "hydrogen bond"]]],
  ["DB11817", "Baricitinib",
    [["M-PPY", "pyrrolopyrimidine"], ["M-AZS", "azetidine ethylsulfonyl"]],
    [["JAK1", 0.94], ["JAK2", 0.92], ["AAK1", 0.61]],
    [["M-PPY", "JAK1", "Leu959", "hinge hydrogen bond"], ["M-PPY", "JAK2", "Leu932", "hinge hydrogen bond"]]],
  ["DB06292", "Dapagliflozin",
    [["M-CGL", "C glucoside"], ["M-DPM", "diarylmethane"]],
    [["SLC5A2", 0.96]],
    [["M-CGL", "SLC5A2", "Gln457", "hydrogen bond"], ["M-DPM", "SLC5A2", "His80", "pi stacking"]]],
  ["DB01221", "Ketamine",
    [["M-ACH", "arylcyclohexylamine"]],
    [["GRIN2B", 0.83], ["GRIN1", 0.8]],
    [["M-ACH", "GRIN1", "Asn616", "pore hydrogen bond"]]],
  ["DB01394", "Colchicine",
    [["M-TRO", "tropolone"], ["M-TMP", "trimethoxyphenyl"]],
    [["TUBB", 0.9], ["NLRP3", 0.34]],
    [["M-TMP", "TUBB", "Cys241", "hydrophobic"]]],
  ["DB00476", "Duloxetine",
    [["M-NAO", "naphthyloxy"], ["M-THI", "thiophene"]],
    [["SLC6A4", 0.89], ["SLC6A2", 0.82]],
    [["M-NAO", "SLC6A4", "Tyr95", "hydrogen bond"]]],
  ["DB00678", "Losartan",
    [["M-BTZ", "biphenyl tetrazole"], ["M-IMZ", "imidazole"]],
    [["AGTR1", 0.93], ["TGFB1", 0.2]],
    [["M-BTZ", "AGTR1", "Arg167", "salt bridge"]]],
  ["DB00331", "Metformin",
    [["M-BIG", "biguanide"]],
    [["PRKAA1", 0.52], ["MTOR", 0.31]],
    [["M-BIG", "PRKAA1", "Asp157", "salt bridge"]]],
  ["DB01611", "Hydroxychloroquine",
    [["M-QUN", "4 aminoquinoline"]],
    [["TLR7", 0.47], ["ACE2", 0.21]],
    [["M-QUN", "TLR7", "Asp555", "salt bridge"]]],
  ["DB01167", "Itraconazole",
    [["M-TRZ", "triazole"], ["M-DOX", "dioxolane"]],
    [["SMO", 0.71]],
    [["M-TRZ", "SMO", "Asp473", "hydrogen bond"]]],
  ["DB00915", "Amantadine",
    [["M-ADM", "adamantane amine"]],
    [["GRIN1", 0.58], ["DRD2", 0.29]],
    [["M-ADM", "GRIN1", "Asn616", "pore hydrogen bond"]]],
  ["DB00481", "Raloxifene",
    [["M-BTH", "benzothiophene"], ["M-PPE", "piperidinylethoxy"]],
    [["ESR1", 0.95]],
    [["M-BTH", "ESR1", "Glu353", "hydrogen bond"], ["M-PPE", "ESR1", "Asp351", "salt bridge"]]],
  ["DB08908", "Dimethyl fumarate",
    [["M-FUM", "fumarate diester"]],
    [["KEAP1", 0.66], ["NFE2L2", 0.4]],
    [["M-FUM", "KEAP1", "Cys151", "covalent"]]],
  ["DB00482", "Celecoxib",
    [["M-DPZ", "diaryl pyrazole"], ["M-SUL", "benzenesulfonamide"]],
    [["PTGS2", 0.94]],
    [["M-SUL", "PTGS2", "Arg513", "hydrogen bond"], ["M-SUL", "PTGS2", "His90", "hydrogen bond"]]],
  ["DB01076", "Atorvastatin",
    [["M-DHA", "dihydroxy heptanoic acid"], ["M-PYR", "pyrrole"]],
    [["HMGCR", 0.95]],
    [["M-DHA", "HMGCR", "Lys735", "salt bridge"]]],
  ["DB00996", "Gabapentin",
    [["M-GAB", "gamma amino acid"]],
    [["CACNA2D1", 0.88]],
    [["M-GAB", "CACNA2D1", "Arg217", "salt bridge"]]],
];

// primekg id, name, signature [gene, weight]
type DiseaseRow = [string, string, [string, number][]];
const DISEASES: DiseaseRow[] = [
  ["15924", "pulmonary arterial hypertension", [["PDE5A", 0.92], ["PRKG1", 0.81], ["NOS3", 0.77], ["EDNRA", 0.74], ["BMPR2", 0.7]]],
  ["6513", "infantile hemangioma", [["VEGFA", 0.86], ["ADRB2", 0.71]]],
  ["9693", "multiple myeloma", [["IKZF1", 0.84], ["IKZF3", 0.82], ["CRBN", 0.66], ["IL6", 0.6]]],
  ["7094", "androgenetic alopecia", [["AR", 0.88], ["SRD5A2", 0.85], ["KCNJ8", 0.42], ["ABCC9", 0.4]]],
  ["100096", "COVID-19", [["ACE2", 0.9], ["IL6", 0.79], ["AAK1", 0.55], ["JAK1", 0.52], ["TLR7", 0.48]]],
  ["5252", "heart failure", [["NPPB", 0.9], ["SLC5A2", 0.44], ["NOS3", 0.4]]],
  ["2050", "treatment resistant depression", [["GRIN2B", 0.8], ["BDNF", 0.78], ["SLC6A4", 0.7]]],
  ["5010", "coronary artery disease", [["NLRP3", 0.73], ["IL1B", 0.72], ["HMGCR", 0.68], ["TUBB", 0.3]]],
  ["5546", "fibromyalgia", [["SLC6A4", 0.69], ["SLC6A2", 0.66], ["SCN9A", 0.5]]],
  ["7947", "Marfan syndrome", [["FBN1", 0.95], ["TGFB1", 0.82], ["AGTR1", 0.58]]],
  ["7254", "breast cancer", [["ESR1", 0.91], ["MTOR", 0.62], ["PRKAA1", 0.35]]],
  ["20804", "basal cell carcinoma", [["PTCH1", 0.93], ["SMO", 0.9], ["GLI1", 0.85]]],
  ["5180", "Parkinson disease", [["SNCA", 0.92], ["DRD2", 0.8], ["GRIN1", 0.45]]],
  ["5083", "psoriasis", [["IL23A", 0.9], ["TNF", 0.84], ["NFE2L2", 0.42], ["KEAP1", 0.4]]],
  ["21055", "familial adenomatous polyposis", [["APC", 0.97], ["PTGS2", 0.74]]],
  ["5301", "multiple sclerosis", [["TNF", 0.6], ["HMGCR", 0.3], ["NFE2L2", 0.35]]],
  ["6008", "postherpetic neuralgia", [["CACNA2D1", 0.82], ["SCN9A", 0.8]]],
];

// rank order: drug, disease, score, path genes with roles
type PredRow = [string, string, number, [string, string][]];
const PREDICTIONS: PredRow[] = [
  ["DB00203", "15924", 0.94, [["PDE5A", "binding target"], ["PRKG1", "cGMP effector"], ["NOS3", "disease signature"]]],
  ["DB00820", "15924", 0.91, [["PDE5A", "binding target"], ["PRKG1", "cGMP effector"]]],
  ["DB00571", "6513", 0.88, [["ADRB2", "binding target"], ["VEGFA", "disease signature"]]],
  ["DB01041", "9693", 0.86, [["CRBN", "binding target"], ["IKZF1", "degraded substrate"], ["IKZF3", "degraded substrate"]]],
  ["DB00350", "7094", 0.84, [["KCNJ8", "binding target"], ["ABCC9", "channel subunit"]]],
  ["DB11817", "100096", 0.82, [["JAK1", "binding target"], ["AAK1", "entry regulator"], ["IL6", "disease signature"]]],
  ["DB06292", "5252", 0.81, [["SLC5A2", "binding target"], ["NPPB", "disease signature"]]],
  ["DB01221", "2050", 0.79, [["GRIN2B", "binding target"], ["BDNF", "downstream effector"]]],
  ["DB01394", "5010", 0.77, [["TUBB", "binding target"], ["NLRP3", "inflammasome"], ["IL1B", "disease signature"]]],
  ["DB00476", "5546", 0.75, [["SLC6A4", "binding target"], ["SLC6A2", "binding target"]]],
  ["DB00678", "7947", 0.74, [["AGTR1", "binding target"], ["TGFB1", "pathway node"], ["FBN1", "disease signature"]]],
  ["DB00331", "7254", 0.72, [["PRKAA1", "binding target"], ["MTOR", "pathway node"]]],
  ["DB01611", "100096", 0.7, [["TLR7", "binding target"], ["ACE2", "disease signature"]]],
  ["DB01167", "20804", 0.69, [["SMO", "binding target"], ["GLI1", "disease signature"]]],
  ["DB00915", "5180", 0.68, [["GRIN1", "binding target"], ["DRD2", "disease signature"]]],
  ["DB00481", "7254", 0.66, [["ESR1", "binding target"]]],
  ["DB08908", "5083", 0.64, [["KEAP1", "binding target"], ["NFE2L2", "released factor"]]],
  ["DB00482", "21055", 0.62, [["PTGS2", "binding target"], ["APC", "disease signature"]]],
  ["DB01076", "5301", 0.6, [["HMGCR", "binding target"]]],
  ["DB00996", "6008", 0.58, [["CACNA2D1", "binding target"], ["SCN9A", "disease signature"]]],
];

const drugById = new Map(DRUGS.map((d) => [d[0], d]));
const diseaseById = new Map(DISEASES.map((d) => [d[0], d]));

const run: RunExport = {
  demo: true,
  notice: NOTICE,
  run_id: "drugrep-demo-run-001",
  created_at: "2026-10-10T09:00:00Z",
  model: {
    name: "DrugRep engine",
    version: "demo-0.9.0",
    config: { layer1: "motif-binding", layer2: "disease-signature", layer3: "path-match", seed: 42 },
  },
  inputs: {
    drug_universe: { source: "DrugBank approved", count: 4498 },
    disease_universe: { source: "PrimeKG", count: 5574 },
    protein_universe: { source: "UniProt", count: 9208 },
    query: { mode: "all-vs-all", min_score: 0.55 },
    id_note: "Demo identifiers. Disease IDs follow the PrimeKG MONDO grouped style.",
  },
  layer1: {
    drugs: DRUGS.map(([id, name, motifs, binding, mr]) => ({
      drugbank_id: id,
      name,
      motifs: motifs.map(([mid, mname]) => ({ id: mid, name: mname })),
      binding: binding.map(([g, score]) => ({ ...prot(g), score })),
      motif_residue_pairs: mr.map(([motif, g, residue, interaction]) => ({ motif, protein: P[g], residue, interaction })),
    })),
  },
  layer2: {
    diseases: DISEASES.map(([id, name, sig]) => ({
      primekg_id: id,
      name,
      signature: sig.map(([g, weight]) => ({ ...prot(g), weight })),
    })),
  },
  layer3: {
    top_k: PREDICTIONS.length,
    predictions: PREDICTIONS.map(([drugId, diseaseId, score, path], i) => {
      const d = drugById.get(drugId)!;
      const dis = diseaseById.get(diseaseId)!;
      const pathGenes = new Set(path.map(([g]) => P[g]));
      return {
        rank: i + 1,
        drugbank_id: drugId,
        drug_name: d[1],
        primekg_id: diseaseId,
        disease_name: dis[1],
        score,
        protein_path: path.map(([g, role]) => ({ ...prot(g), role })),
        motif_residue_pairs: d[4]
          .filter(([, g]) => pathGenes.has(P[g]))
          .map(([motif, g, residue, interaction]) => ({ motif, protein: P[g], residue, interaction })),
      };
    }),
  },
};

// Simulated lab labels: 1 = the indication was confirmed in this (simulated)
// trial or assay set, 0 = tested and not confirmed. Some records are pairs
// DrugRep never predicted, as in any real lab dataset.
const LAB: [string, string, 0 | 1, string][] = [
  ["DB00203", "15924", 1, "sildenafil / pulmonary arterial hypertension"],
  ["DB00820", "15924", 1, "tadalafil / pulmonary arterial hypertension"],
  ["DB01041", "9693", 1, "thalidomide / multiple myeloma"],
  ["DB11817", "100096", 1, "baricitinib / COVID-19"],
  ["DB06292", "5252", 1, "dapagliflozin / heart failure"],
  ["DB01221", "2050", 1, "ketamine / treatment resistant depression"],
  ["DB00915", "5180", 1, "amantadine / Parkinson disease"],
  ["DB08908", "5083", 1, "dimethyl fumarate / psoriasis"],
  ["DB00678", "7947", 0, "losartan / Marfan syndrome"],
  ["DB00331", "7254", 0, "metformin / breast cancer"],
  ["DB01611", "100096", 0, "hydroxychloroquine / COVID-19"],
  ["DB01076", "5301", 0, "atorvastatin / multiple sclerosis"],
  ["DB01156", "4000", 1, "bupropion / smoking cessation"],
  ["DB00273", "5277", 1, "topiramate / migraine"],
  ["DB00945", "5575", 1, "aspirin / colorectal cancer"],
  ["DB01216", "7094", 1, "finasteride / androgenetic alopecia"],
  ["DB00563", "8383", 0, "methotrexate / osteoarthritis"],
  ["DB00641", "4975", 0, "simvastatin / Alzheimer disease"],
  ["DB00959", "5147", 0, "methylprednisolone / type 2 diabetes"],
  ["DB00586", "5090", 1, "diclofenac / actinic keratosis"],
  ["DB01088", "2009", 0, "iloprost / major depressive disorder"],
  ["DB00175", "5148", 1, "pravastatin / hypercholesterolemia"],
];
const labRecords: LabRecord[] = LAB.map(([drugbank_id, primekg_id, outcome, label]) => ({ drugbank_id, primekg_id, outcome, label }));

writeFileSync(join(here, "demo-run.json"), JSON.stringify(run, null, 2) + "\n");
writeFileSync(
  join(here, "demo-lab-records.json"),
  JSON.stringify({ demo: true, notice: "DEMO DATA. Simulated lab labels, not real trial or patient data.", records: labRecords }, null, 2) + "\n",
);
console.log(`demo-run.json: ${run.layer3.predictions.length} predictions, demo-lab-records.json: ${labRecords.length} records`);
