/**
 * Legal Document Generation Studio - Template Definitions
 * 
 * Contains all document template definitions with sections, variables,
 * and conditional logic for the document generation wizard.
 */

import { DocumentTemplate } from './types';
import {
  employmentAgreementContent,
  ndaContent,
  contractorAgreementContent,
  consultingAgreementContent,
  leaseAgreementContent
} from './template-content';

// Employment Agreement Template
const employmentAgreement: DocumentTemplate = {
  id: 'employment-agreement',
  name: 'Employment Agreement',
  description: 'Standard employment contract covering position, compensation, benefits, and terms of employment.',
  category: 'employment',
  version: '1.0.0',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  tags: ['employment', 'hr', 'hiring'],
  sections: [
    {
      id: 'parties',
      title: 'Parties',
      description: 'Information about the employer and employee',
      variables: [
        {
          id: 'employer_name',
          name: 'employer_name',
          label: 'Employer Name',
          type: 'text',
          required: true,
          placeholder: 'Acme Corporation',
          helpText: 'Legal name of the employing company'
        },
        {
          id: 'employer_address',
          name: 'employer_address',
          label: 'Employer Address',
          type: 'textarea',
          required: true,
          placeholder: '123 Business Ave, Suite 100, San Francisco, CA 94102'
        },
        {
          id: 'employee_name',
          name: 'employee_name',
          label: 'Employee Name',
          type: 'text',
          required: true,
          placeholder: 'John Smith'
        },
        {
          id: 'employee_address',
          name: 'employee_address',
          label: 'Employee Address',
          type: 'textarea',
          required: true,
          placeholder: '456 Residential St, Apt 7, San Francisco, CA 94103'
        }
      ]
    },
    {
      id: 'position',
      title: 'Position Details',
      description: 'Job title, responsibilities, and work location',
      variables: [
        {
          id: 'job_title',
          name: 'job_title',
          label: 'Job Title',
          type: 'text',
          required: true,
          placeholder: 'Software Engineer'
        },
        {
          id: 'department',
          name: 'department',
          label: 'Department',
          type: 'text',
          required: false,
          placeholder: 'Engineering'
        },
        {
          id: 'reports_to',
          name: 'reports_to',
          label: 'Reports To',
          type: 'text',
          required: false,
          placeholder: 'VP of Engineering'
        },
        {
          id: 'work_location',
          name: 'work_location',
          label: 'Work Location',
          type: 'select',
          required: true,
          options: ['onsite', 'remote', 'hybrid']
        },
        {
          id: 'office_address',
          name: 'office_address',
          label: 'Office Address',
          type: 'textarea',
          required: false,
          placeholder: 'Office location if applicable'
        },
        {
          id: 'state',
          name: 'state',
          label: 'Employment State',
          type: 'select',
          required: true,
          helpText: 'State where employment laws apply',
          options: ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Washington', 'Massachusetts', 'Colorado', 'Other']
        }
      ]
    },
    {
      id: 'compensation',
      title: 'Compensation',
      description: 'Salary, bonuses, and payment terms',
      variables: [
        {
          id: 'employment_type',
          name: 'employment_type',
          label: 'Employment Type',
          type: 'select',
          required: true,
          options: ['full-time', 'part-time', 'contract']
        },
        {
          id: 'salary_type',
          name: 'salary_type',
          label: 'Compensation Type',
          type: 'select',
          required: true,
          options: ['annual', 'hourly']
        },
        {
          id: 'salary_amount',
          name: 'salary_amount',
          label: 'Salary Amount',
          type: 'number',
          required: true,
          placeholder: '150000',
          helpText: 'Annual salary or hourly rate'
        },
        {
          id: 'pay_frequency',
          name: 'pay_frequency',
          label: 'Pay Frequency',
          type: 'select',
          required: true,
          options: ['weekly', 'bi-weekly', 'semi-monthly', 'monthly']
        },
        {
          id: 'bonus_eligible',
          name: 'bonus_eligible',
          label: 'Bonus Eligible',
          type: 'boolean',
          required: true,
          defaultValue: false
        },
        {
          id: 'bonus_percentage',
          name: 'bonus_percentage',
          label: 'Target Bonus (%)',
          type: 'number',
          required: false,
          placeholder: '15'
        },
        {
          id: 'equity_eligible',
          name: 'equity_eligible',
          label: 'Equity/Stock Options',
          type: 'boolean',
          required: true,
          defaultValue: false
        },
        {
          id: 'equity_shares',
          name: 'equity_shares',
          label: 'Number of Stock Options',
          type: 'number',
          required: false,
          placeholder: '10000'
        }
      ]
    },
    {
      id: 'dates',
      title: 'Employment Dates',
      description: 'Start date and employment term',
      variables: [
        {
          id: 'start_date',
          name: 'start_date',
          label: 'Start Date',
          type: 'date',
          required: true
        },
        {
          id: 'is_at_will',
          name: 'is_at_will',
          label: 'At-Will Employment',
          type: 'boolean',
          required: true,
          defaultValue: true,
          helpText: 'Employment can be terminated by either party at any time'
        },
        {
          id: 'contract_duration',
          name: 'contract_duration',
          label: 'Contract Duration (months)',
          type: 'number',
          required: false,
          placeholder: '12'
        }
      ]
    },
    {
      id: 'benefits',
      title: 'Benefits',
      description: 'Health insurance, PTO, and other benefits',
      variables: [
        {
          id: 'health_insurance',
          name: 'health_insurance',
          label: 'Health Insurance',
          type: 'boolean',
          required: true,
          defaultValue: true
        },
        {
          id: 'dental_vision',
          name: 'dental_vision',
          label: 'Dental & Vision',
          type: 'boolean',
          required: true,
          defaultValue: true
        },
        {
          id: 'pto_days',
          name: 'pto_days',
          label: 'PTO Days per Year',
          type: 'number',
          required: true,
          placeholder: '20',
          defaultValue: 15
        },
        {
          id: 'retirement_401k',
          name: 'retirement_401k',
          label: '401(k) Plan',
          type: 'boolean',
          required: true,
          defaultValue: true
        },
        {
          id: 'retirement_match',
          name: 'retirement_match',
          label: '401(k) Match (%)',
          type: 'number',
          required: false,
          placeholder: '4'
        }
      ]
    }
  ],
  content: employmentAgreementContent
};

// Non-Disclosure Agreement Template
const ndaTemplate: DocumentTemplate = {
  id: 'nda-mutual',
  name: 'Mutual Non-Disclosure Agreement',
  description: 'Mutual NDA for protecting confidential information shared between two parties.',
  category: 'nda',
  version: '1.0.0',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  tags: ['nda', 'confidentiality', 'privacy'],
  sections: [
    {
      id: 'parties',
      title: 'Parties',
      description: 'Information about both parties to the NDA',
      variables: [
        {
          id: 'party_a_name',
          name: 'party_a_name',
          label: 'First Party Name',
          type: 'text',
          required: true,
          placeholder: 'Your Company, Inc.'
        },
        {
          id: 'party_a_type',
          name: 'party_a_type',
          label: 'First Party Type',
          type: 'select',
          required: true,
          options: ['corporation', 'llc', 'partnership', 'individual']
        },
        {
          id: 'party_a_state',
          name: 'party_a_state',
          label: 'First Party State of Formation',
          type: 'text',
          required: true,
          placeholder: 'Delaware'
        },
        {
          id: 'party_b_name',
          name: 'party_b_name',
          label: 'Second Party Name',
          type: 'text',
          required: true,
          placeholder: 'Other Company, LLC'
        },
        {
          id: 'party_b_type',
          name: 'party_b_type',
          label: 'Second Party Type',
          type: 'select',
          required: true,
          options: ['corporation', 'llc', 'partnership', 'individual']
        },
        {
          id: 'party_b_state',
          name: 'party_b_state',
          label: 'Second Party State of Formation',
          type: 'text',
          required: true,
          placeholder: 'California'
        }
      ]
    },
    {
      id: 'purpose',
      title: 'Purpose',
      description: 'The business purpose for sharing confidential information',
      variables: [
        {
          id: 'purpose',
          name: 'purpose',
          label: 'Purpose of Disclosure',
          type: 'textarea',
          required: true,
          placeholder: 'Evaluating a potential business partnership or transaction',
          helpText: 'Describe why confidential information will be shared'
        }
      ]
    },
    {
      id: 'terms',
      title: 'Terms',
      description: 'Duration and scope of the agreement',
      variables: [
        {
          id: 'effective_date',
          name: 'effective_date',
          label: 'Effective Date',
          type: 'date',
          required: true
        },
        {
          id: 'term_years',
          name: 'term_years',
          label: 'Agreement Term (years)',
          type: 'number',
          required: true,
          defaultValue: 2,
          placeholder: '2'
        },
        {
          id: 'confidentiality_period',
          name: 'confidentiality_period',
          label: 'Confidentiality Period (years)',
          type: 'number',
          required: true,
          defaultValue: 3,
          placeholder: '3',
          helpText: 'How long information must remain confidential after agreement ends'
        },
        {
          id: 'governing_state',
          name: 'governing_state',
          label: 'Governing Law State',
          type: 'text',
          required: true,
          placeholder: 'Delaware'
        }
      ]
    }
  ],
  content: ndaContent
};

// Independent Contractor Agreement Template
const contractorAgreement: DocumentTemplate = {
  id: 'contractor-agreement',
  name: 'Independent Contractor Agreement',
  description: 'Agreement for engaging independent contractors for services.',
  category: 'services',
  version: '1.0.0',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  tags: ['contractor', 'freelance', 'services'],
  sections: [
    {
      id: 'parties',
      title: 'Parties',
      description: 'Information about the company and contractor',
      variables: [
        {
          id: 'company_name',
          name: 'company_name',
          label: 'Company Name',
          type: 'text',
          required: true,
          placeholder: 'Acme Corporation'
        },
        {
          id: 'company_address',
          name: 'company_address',
          label: 'Company Address',
          type: 'textarea',
          required: true,
          placeholder: '123 Business Ave, San Francisco, CA 94102'
        },
        {
          id: 'contractor_name',
          name: 'contractor_name',
          label: 'Contractor Name',
          type: 'text',
          required: true,
          placeholder: 'Jane Doe'
        },
        {
          id: 'contractor_business_name',
          name: 'contractor_business_name',
          label: 'Contractor Business Name (if applicable)',
          type: 'text',
          required: false,
          placeholder: 'Jane Doe Consulting, LLC'
        },
        {
          id: 'contractor_address',
          name: 'contractor_address',
          label: 'Contractor Address',
          type: 'textarea',
          required: true,
          placeholder: '456 Contractor St, Oakland, CA 94612'
        }
      ]
    },
    {
      id: 'services',
      title: 'Services',
      description: 'Description of services to be provided',
      variables: [
        {
          id: 'services_description',
          name: 'services_description',
          label: 'Description of Services',
          type: 'textarea',
          required: true,
          placeholder: 'Software development services including...',
          helpText: 'Detailed description of the work to be performed'
        },
        {
          id: 'deliverables',
          name: 'deliverables',
          label: 'Deliverables',
          type: 'textarea',
          required: true,
          placeholder: 'List specific deliverables...',
          helpText: 'Specific items or outcomes to be delivered'
        }
      ]
    },
    {
      id: 'compensation',
      title: 'Compensation',
      description: 'Payment terms and rates',
      variables: [
        {
          id: 'payment_type',
          name: 'payment_type',
          label: 'Payment Type',
          type: 'select',
          required: true,
          options: ['hourly', 'fixed', 'retainer']
        },
        {
          id: 'rate_amount',
          name: 'rate_amount',
          label: 'Rate/Fee Amount',
          type: 'number',
          required: true,
          placeholder: '150'
        },
        {
          id: 'max_hours',
          name: 'max_hours',
          label: 'Maximum Hours (if hourly)',
          type: 'number',
          required: false,
          placeholder: '160'
        },
        {
          id: 'payment_terms',
          name: 'payment_terms',
          label: 'Payment Terms',
          type: 'select',
          required: true,
          options: ['net15', 'net30', 'net45', 'upon_completion']
        },
        {
          id: 'expense_reimbursement',
          name: 'expense_reimbursement',
          label: 'Expense Reimbursement',
          type: 'boolean',
          required: true,
          defaultValue: false
        },
        {
          id: 'expense_cap',
          name: 'expense_cap',
          label: 'Expense Cap',
          type: 'number',
          required: false,
          placeholder: '1000'
        }
      ]
    },
    {
      id: 'term',
      title: 'Term',
      description: 'Duration of the engagement',
      variables: [
        {
          id: 'start_date',
          name: 'start_date',
          label: 'Start Date',
          type: 'date',
          required: true
        },
        {
          id: 'end_date',
          name: 'end_date',
          label: 'End Date',
          type: 'date',
          required: false,
          helpText: 'Leave blank for ongoing engagement'
        },
        {
          id: 'termination_notice',
          name: 'termination_notice',
          label: 'Termination Notice (days)',
          type: 'number',
          required: true,
          defaultValue: 14,
          placeholder: '14'
        },
        {
          id: 'governing_state',
          name: 'governing_state',
          label: 'Governing Law State',
          type: 'text',
          required: true,
          placeholder: 'California'
        }
      ]
    }
  ],
  content: contractorAgreementContent
};

// Consulting Services Agreement Template
const consultingAgreement: DocumentTemplate = {
  id: 'consulting-agreement',
  name: 'Consulting Services Agreement',
  description: 'Professional services agreement for consulting engagements.',
  category: 'services',
  version: '1.0.0',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  tags: ['consulting', 'professional services', 'engagement'],
  sections: [
    {
      id: 'parties',
      title: 'Parties',
      description: 'Client and consultant information',
      variables: [
        {
          id: 'client_name',
          name: 'client_name',
          label: 'Client Name',
          type: 'text',
          required: true,
          placeholder: 'Client Corporation'
        },
        {
          id: 'client_address',
          name: 'client_address',
          label: 'Client Address',
          type: 'textarea',
          required: true
        },
        {
          id: 'consultant_name',
          name: 'consultant_name',
          label: 'Consultant Name',
          type: 'text',
          required: true,
          placeholder: 'Consulting Firm, LLC'
        },
        {
          id: 'consultant_address',
          name: 'consultant_address',
          label: 'Consultant Address',
          type: 'textarea',
          required: true
        }
      ]
    },
    {
      id: 'engagement',
      title: 'Engagement Details',
      description: 'Scope and nature of consulting services',
      variables: [
        {
          id: 'project_name',
          name: 'project_name',
          label: 'Project Name',
          type: 'text',
          required: true,
          placeholder: 'Digital Transformation Initiative'
        },
        {
          id: 'services_scope',
          name: 'services_scope',
          label: 'Scope of Services',
          type: 'textarea',
          required: true,
          placeholder: 'Describe the consulting services in detail...'
        },
        {
          id: 'key_personnel',
          name: 'key_personnel',
          label: 'Key Personnel',
          type: 'text',
          required: false,
          placeholder: 'Names of key consultants assigned to the project'
        }
      ]
    },
    {
      id: 'fees',
      title: 'Fees and Payment',
      description: 'Consulting fees and payment schedule',
      variables: [
        {
          id: 'fee_structure',
          name: 'fee_structure',
          label: 'Fee Structure',
          type: 'select',
          required: true,
          options: ['time_materials', 'fixed_fee', 'milestone']
        },
        {
          id: 'hourly_rate',
          name: 'hourly_rate',
          label: 'Hourly Rate',
          type: 'number',
          required: false,
          placeholder: '250'
        },
        {
          id: 'fixed_fee_amount',
          name: 'fixed_fee_amount',
          label: 'Fixed Fee Amount',
          type: 'number',
          required: false,
          placeholder: '50000'
        },
        {
          id: 'estimated_budget',
          name: 'estimated_budget',
          label: 'Estimated Budget',
          type: 'number',
          required: true,
          placeholder: '100000'
        },
        {
          id: 'invoice_frequency',
          name: 'invoice_frequency',
          label: 'Invoice Frequency',
          type: 'select',
          required: true,
          options: ['weekly', 'bi-weekly', 'monthly', 'milestone']
        }
      ]
    },
    {
      id: 'timeline',
      title: 'Timeline',
      description: 'Project duration and milestones',
      variables: [
        {
          id: 'effective_date',
          name: 'effective_date',
          label: 'Effective Date',
          type: 'date',
          required: true
        },
        {
          id: 'project_duration',
          name: 'project_duration',
          label: 'Project Duration (months)',
          type: 'number',
          required: true,
          placeholder: '6'
        },
        {
          id: 'governing_state',
          name: 'governing_state',
          label: 'Governing Law State',
          type: 'text',
          required: true,
          placeholder: 'New York'
        }
      ]
    }
  ],
  content: consultingAgreementContent
};

// Residential Lease Agreement Template
const leaseAgreement: DocumentTemplate = {
  id: 'lease-agreement',
  name: 'Residential Lease Agreement',
  description: 'Standard residential lease agreement for rental properties.',
  category: 'lease',
  version: '1.0.0',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  tags: ['lease', 'rental', 'residential', 'property'],
  sections: [
    {
      id: 'parties',
      title: 'Parties',
      description: 'Landlord and tenant information',
      variables: [
        {
          id: 'landlord_name',
          name: 'landlord_name',
          label: 'Landlord Name',
          type: 'text',
          required: true,
          placeholder: 'Property Management LLC'
        },
        {
          id: 'landlord_address',
          name: 'landlord_address',
          label: 'Landlord Address',
          type: 'textarea',
          required: true
        },
        {
          id: 'tenant_name',
          name: 'tenant_name',
          label: 'Tenant Name(s)',
          type: 'text',
          required: true,
          placeholder: 'John Smith and Jane Smith'
        },
        {
          id: 'tenant_phone',
          name: 'tenant_phone',
          label: 'Tenant Phone',
          type: 'text',
          required: true
        },
        {
          id: 'tenant_email',
          name: 'tenant_email',
          label: 'Tenant Email',
          type: 'text',
          required: true
        }
      ]
    },
    {
      id: 'property',
      title: 'Property',
      description: 'Details about the rental property',
      variables: [
        {
          id: 'property_address',
          name: 'property_address',
          label: 'Property Address',
          type: 'textarea',
          required: true,
          placeholder: '123 Main Street, Apt 4B, City, State ZIP'
        },
        {
          id: 'property_type',
          name: 'property_type',
          label: 'Property Type',
          type: 'select',
          required: true,
          options: ['apartment', 'house', 'condo', 'townhouse']
        },
        {
          id: 'bedrooms',
          name: 'bedrooms',
          label: 'Number of Bedrooms',
          type: 'number',
          required: true,
          placeholder: '2'
        },
        {
          id: 'bathrooms',
          name: 'bathrooms',
          label: 'Number of Bathrooms',
          type: 'number',
          required: true,
          placeholder: '1'
        },
        {
          id: 'furnished',
          name: 'furnished',
          label: 'Furnished',
          type: 'boolean',
          required: true,
          defaultValue: false
        },
        {
          id: 'parking_included',
          name: 'parking_included',
          label: 'Parking Included',
          type: 'boolean',
          required: true,
          defaultValue: false
        },
        {
          id: 'parking_spaces',
          name: 'parking_spaces',
          label: 'Number of Parking Spaces',
          type: 'number',
          required: false
        }
      ]
    },
    {
      id: 'lease_terms',
      title: 'Lease Terms',
      description: 'Duration and dates of the lease',
      variables: [
        {
          id: 'lease_start_date',
          name: 'lease_start_date',
          label: 'Lease Start Date',
          type: 'date',
          required: true
        },
        {
          id: 'lease_end_date',
          name: 'lease_end_date',
          label: 'Lease End Date',
          type: 'date',
          required: true
        },
        {
          id: 'lease_type',
          name: 'lease_type',
          label: 'Lease Type',
          type: 'select',
          required: true,
          options: ['fixed', 'month_to_month']
        }
      ]
    },
    {
      id: 'rent',
      title: 'Rent and Deposits',
      description: 'Monthly rent and security deposit',
      variables: [
        {
          id: 'monthly_rent',
          name: 'monthly_rent',
          label: 'Monthly Rent',
          type: 'number',
          required: true,
          placeholder: '2000'
        },
        {
          id: 'rent_due_day',
          name: 'rent_due_day',
          label: 'Rent Due Day of Month',
          type: 'number',
          required: true,
          defaultValue: 1,
          placeholder: '1'
        },
        {
          id: 'security_deposit',
          name: 'security_deposit',
          label: 'Security Deposit',
          type: 'number',
          required: true,
          placeholder: '4000'
        },
        {
          id: 'late_fee',
          name: 'late_fee',
          label: 'Late Fee',
          type: 'number',
          required: true,
          placeholder: '100'
        },
        {
          id: 'grace_period_days',
          name: 'grace_period_days',
          label: 'Grace Period (days)',
          type: 'number',
          required: true,
          defaultValue: 5,
          placeholder: '5'
        }
      ]
    },
    {
      id: 'utilities',
      title: 'Utilities',
      description: 'Utility responsibilities',
      variables: [
        {
          id: 'utilities_included',
          name: 'utilities_included',
          label: 'Utilities Included in Rent',
          type: 'select',
          required: true,
          options: ['all', 'some', 'none']
        },
        {
          id: 'included_utilities_list',
          name: 'included_utilities_list',
          label: 'List of Included Utilities',
          type: 'text',
          required: false,
          placeholder: 'Water, Trash'
        }
      ]
    },
    {
      id: 'rules',
      title: 'Rules and Policies',
      description: 'Property rules and restrictions',
      variables: [
        {
          id: 'pets_allowed',
          name: 'pets_allowed',
          label: 'Pets Allowed',
          type: 'boolean',
          required: true,
          defaultValue: false
        },
        {
          id: 'pet_deposit',
          name: 'pet_deposit',
          label: 'Pet Deposit',
          type: 'number',
          required: false,
          placeholder: '500'
        },
        {
          id: 'smoking_allowed',
          name: 'smoking_allowed',
          label: 'Smoking Allowed',
          type: 'boolean',
          required: true,
          defaultValue: false
        },
        {
          id: 'max_occupants',
          name: 'max_occupants',
          label: 'Maximum Occupants',
          type: 'number',
          required: true,
          placeholder: '4'
        },
        {
          id: 'governing_state',
          name: 'governing_state',
          label: 'State',
          type: 'text',
          required: true,
          placeholder: 'California'
        }
      ]
    }
  ],
  content: leaseAgreementContent
};

// Export all templates
export const templates: DocumentTemplate[] = [
  employmentAgreement,
  ndaTemplate,
  contractorAgreement,
  consultingAgreement,
  leaseAgreement
];

// Helper function to get template by ID
export function getTemplateById(id: string): DocumentTemplate | undefined {
  return templates.find(t => t.id === id);
}

// Helper function to get templates by category
export function getTemplatesByCategory(category: DocumentTemplate['category']): DocumentTemplate[] {
  return templates.filter(t => t.category === category);
}

// Helper function to get all categories with counts
export function getCategories(): { id: DocumentTemplate['category']; name: string; count: number; icon: string }[] {
  const categoryMap: Record<DocumentTemplate['category'], { name: string; icon: string }> = {
    employment: { name: 'Employment', icon: '👔' },
    nda: { name: 'Non-Disclosure', icon: '🔒' },
    services: { name: 'Services', icon: '📋' },
    lease: { name: 'Lease', icon: '🏠' },
    corporate: { name: 'Corporate', icon: '🏢' },
    litigation: { name: 'Litigation', icon: '⚖️' }
  };

  const counts = templates.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(categoryMap)
    .filter(([id]) => counts[id] > 0)
    .map(([id, info]) => ({
      id: id as DocumentTemplate['category'],
      name: info.name,
      count: counts[id] || 0,
      icon: info.icon
    }));
}

// Helper function to search templates
export function searchTemplates(query: string): DocumentTemplate[] {
  const lowerQuery = query.toLowerCase();
  return templates.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
