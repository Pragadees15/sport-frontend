import { SportRole } from '../types';

export const sportRoles: SportRole[] = [
  // Martial Arts Roles
  {
    id: 'ma-1',
    name: 'Karate Black Belt',
    category: 'martial-arts',
    description: 'Certified black belt in Karate',
    isProfessional: true,
    requiresEvidence: true,
    evidenceTypes: ['certificate', 'license', 'award']
  },
  {
    id: 'ma-2',
    name: 'Taekwondo Instructor',
    category: 'martial-arts',
    description: 'Certified Taekwondo instructor',
    isProfessional: true,
    requiresEvidence: true,
    evidenceTypes: ['certificate', 'license']
  },
  {
    id: 'ma-3',
    name: 'Judo Practitioner',
    category: 'martial-arts',
    description: 'Judo practitioner with competition experience',
    isProfessional: false,
    requiresEvidence: false,
    evidenceTypes: ['competition-result', 'training-record']
  },
  {
    id: 'ma-4',
    name: 'Boxing Trainer',
    category: 'martial-arts',
    description: 'Professional boxing trainer',
    isProfessional: true,
    requiresEvidence: true,
    evidenceTypes: ['certificate', 'license']
  },
  {
    id: 'ma-5',
    name: 'Martial Arts Enthusiast',
    category: 'martial-arts',
    description: 'Martial arts enthusiast and learner',
    isProfessional: false,
    requiresEvidence: false,
    evidenceTypes: ['training-record']
  },

  // Calorie Fight (Fitness) Roles
  {
    id: 'cf-1',
    name: 'Personal Trainer',
    category: 'calorie-fight',
    description: 'Certified personal trainer',
    isProfessional: true,
    requiresEvidence: true,
    evidenceTypes: ['certificate', 'license']
  },
  {
    id: 'cf-2',
    name: 'Fitness Instructor',
    category: 'calorie-fight',
    description: 'Group fitness instructor',
    isProfessional: true,
    requiresEvidence: true,
    evidenceTypes: ['certificate', 'license']
  },
  {
    id: 'cf-3',
    name: 'Yoga Teacher',
    category: 'calorie-fight',
    description: 'Certified yoga instructor',
    isProfessional: true,
    requiresEvidence: true,
    evidenceTypes: ['certificate', 'license']
  },
  {
    id: 'cf-4',
    name: 'CrossFit Athlete',
    category: 'calorie-fight',
    description: 'Competitive CrossFit athlete',
    isProfessional: false,
    requiresEvidence: false,
    evidenceTypes: ['competition-result', 'training-record']
  },
  {
    id: 'cf-5',
    name: 'Fitness Enthusiast',
    category: 'calorie-fight',
    description: 'Fitness enthusiast and regular exerciser',
    isProfessional: false,
    requiresEvidence: false,
    evidenceTypes: ['training-record']
  },

  // Coco Sports Roles
  {
    id: 'coco-1',
    name: 'Coco Coach',
    category: 'coco',
    description: 'Professional Coco sports coach',
    isProfessional: true,
    requiresEvidence: true,
    evidenceTypes: ['certificate', 'license']
  },
  {
    id: 'coco-2',
    name: 'Coco Player',
    category: 'coco',
    description: 'Competitive Coco player',
    isProfessional: false,
    requiresEvidence: false,
    evidenceTypes: ['competition-result', 'training-record']
  },
  {
    id: 'coco-3',
    name: 'Coco Referee',
    category: 'coco',
    description: 'Certified Coco referee',
    isProfessional: true,
    requiresEvidence: true,
    evidenceTypes: ['certificate', 'license']
  },
  {
    id: 'coco-4',
    name: 'Coco Enthusiast',
    category: 'coco',
    description: 'Coco sports enthusiast',
    isProfessional: false,
    requiresEvidence: false,
    evidenceTypes: ['training-record']
  },


];

export const getSportRolesByCategory = (category: string): SportRole[] => {
  if (category === 'all') return sportRoles;
  return sportRoles.filter(role => role.category === category);
};

export const getSportRoleById = (id: string): SportRole | undefined => {
  return sportRoles.find(role => role.id === id);
};

export const getProfessionalRoles = (): SportRole[] => {
  return sportRoles.filter(role => role.isProfessional);
};

export const getNonProfessionalRoles = (): SportRole[] => {
  return sportRoles.filter(role => !role.isProfessional);
};
