export interface Atom {
  id: string;
  name: string;
  symbol: string;
  color: string;
  textColor: string;
  radius: number;
  valency?: string; // e.g., "+1", "-2", "+2, +3"
  oxidationStates?: number[];
  instanceId?: number;
  x?: number;
  y?: number;
}

export interface Reaction {
  id: string;
  name: string;
  formula: string;
  emoji: string;
  reactants: string[];
  bondType: string;
  explanation: string;
  molecularDensity?: string;
  acidBase?: string;
  applications?: string;
  commonality?: string; // e.g., "شائع جدًا", "شائع", "غير شائع"
  // New detailed fields
  molarMass?: string;
  state?: string;
  molecularGeometry?: string;
  lewisStructure?: string;
  safety?: {
    warnings: string[];
    ghsSymbols: string[];
  };
  namingMethod?: string;
}

export interface Product {
  name: string;
  formula: string;
  state: string; // e.g., "(s)", "(l)", "(g)", "(aq)"
}

export interface CompoundReaction {
  id: string; // 'none' if no reaction
  balancedEquation: string;
  reactionType: string;
  explanation: string;
  products: Product[];
  safetyNotes: string[];
}

export interface OrganicCompoundInfo {
  id: string;
  name: string;
  formula: string;
  family: string;
  description: string;
  uses: string;
  stateAtSTP: string;
  iupacNaming: string;
  boilingPoint?: string;
  meltingPoint?: string;
  lewisStructureImage?: string; // To hold the base64 image URL
}

export interface BiomoleculeInfo {
  id: string;
  name: string;
  formula: string;
  type: string;
  description: string;
  biologicalFunction: string;
  structureImage: string;
}

export interface GalvanicCellInfo {
  id: string;
  anode: {
    metal: string;
    halfReaction: string;
  };
  cathode: {
    metal: string;
    halfReaction: string;
  };
  overallReaction: string;
  cellPotential: string;
  explanation: string;
  diagramImage: string;
}

export interface ThermoChemistryInfo {
  id: string;
  equation: string;
  enthalpyChange: string; // e.g., "-285.8 kJ/mol"
  entropyChange: string; // e.g., "-163.3 J/mol·K"
  gibbsFreeEnergyChange: string; // e.g., "-237.1 kJ/mol"
  isExothermic: boolean;
  isSpontaneous: boolean;
  explanation: string;
  energyProfileImage: string; // base64 URL
}

export interface SolutionChemistryInfo {
  id: string;
  soluteName: string;
  soluteFormula: string;
  solventName: string;
  concentrationMolarity: string;
  solutionDescription: string;
  solutionType: string; // e.g., "محلول إلكتروليتي قوي", "محلول غير إلكتروليتي"
  solutionImage: string; // base64 URL
}


export interface DisplayCompound {
  name: string;
  formula: string;
  imageUrl: string;
}