/**
 * Legal Document Generation Studio - Template Content
 * 
 * Template markdown content with variable placeholders.
 * Uses Handlebars-like syntax: {{variable}}, {{#if}}, {{else}}, {{/if}}
 */

// Employment Agreement Template Content
export const employmentAgreementContent = `# EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is entered into as of {{start_date}} by and between:

**EMPLOYER:**
{{employer_name}}
{{employer_address}}

**EMPLOYEE:**
{{employee_name}}
{{employee_address}}

## 1. POSITION AND DUTIES

**1.1 Position.** Employer hereby employs Employee as **{{job_title}}**{{#if department}} in the {{department}} department{{/if}}{{#if reports_to}}, reporting to {{reports_to}}{{/if}}.

**1.2 Duties.** Employee agrees to perform all duties and responsibilities associated with the position of {{job_title}}, as well as such other duties as may be assigned from time to time by Employer.

**1.3 Work Location.** Employee's primary work location shall be {{#if work_location_onsite}}on-site at {{office_address}}{{/if}}{{#if work_location_remote}}remote{{/if}}{{#if work_location_hybrid}}hybrid, with time split between remote work and the office at {{office_address}}{{/if}}.

## 2. COMPENSATION

**2.1 Base Compensation.** Employer shall pay Employee {{#if salary_type_annual}}an annual salary of \${{salary_amount}}{{/if}}{{#if salary_type_hourly}}an hourly rate of \${{salary_amount}}{{/if}}, payable {{pay_frequency}} in accordance with Employer's standard payroll practices.

{{#if bonus_eligible}}
**2.2 Bonus.** Employee shall be eligible for an annual performance bonus with a target of {{bonus_percentage}}% of base salary, subject to achievement of performance goals and Employer's discretion.
{{/if}}

{{#if equity_eligible}}
**2.3 Equity.** Subject to approval by Employer's Board of Directors, Employee shall be granted an option to purchase {{equity_shares}} shares of Employer's common stock, subject to the terms of Employer's equity incentive plan and a standard four-year vesting schedule.
{{/if}}

## 3. BENEFITS

**3.1 Benefits.** Employee shall be entitled to participate in the following benefit programs, subject to the terms and conditions of each program:

{{#if health_insurance}}
- Health insurance coverage
{{/if}}
{{#if dental_vision}}
- Dental and vision insurance
{{/if}}
{{#if retirement_401k}}
- 401(k) retirement plan{{#if retirement_match}} with {{retirement_match}}% employer match{{/if}}
{{/if}}

**3.2 Paid Time Off.** Employee shall be entitled to {{pto_days}} days of paid time off per year, to be accrued and used in accordance with Employer's PTO policy.

## 4. EMPLOYMENT TERM

{{#if is_at_will}}
**4.1 At-Will Employment.** Employee's employment with Employer is "at-will," meaning that either Employee or Employer may terminate the employment relationship at any time, with or without cause, and with or without notice.
{{else}}
**4.1 Term.** This Agreement shall be for a term of {{contract_duration}} months, commencing on {{start_date}}, unless earlier terminated in accordance with this Agreement.
{{/if}}

## 5. CONFIDENTIALITY

**5.1 Confidential Information.** Employee acknowledges that during employment, Employee will have access to and become acquainted with confidential and proprietary information belonging to Employer. Employee agrees to hold all such information in strict confidence and not to disclose or use such information except as required in the performance of Employee's duties.

## 6. GOVERNING LAW

This Agreement shall be governed by and construed in accordance with the laws of the State of {{state}}, without regard to its conflict of laws principles.

## 7. ENTIRE AGREEMENT

This Agreement constitutes the entire agreement between the parties concerning the subject matter hereof and supersedes all prior agreements and understandings, whether written or oral.

---

**IN WITNESS WHEREOF**, the parties have executed this Agreement as of the date first written above.

**EMPLOYER:**

_________________________
{{employer_name}}
By: ___________________
Title: _________________
Date: _________________

**EMPLOYEE:**

_________________________
{{employee_name}}
Date: _________________
`;

// Non-Disclosure Agreement Template Content
export const ndaContent = `# MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of {{effective_date}} ("Effective Date") by and between:

**{{party_a_name}}**, a {{party_a_type}} organized under the laws of {{party_a_state}} ("Party A")

and

**{{party_b_name}}**, a {{party_b_type}} organized under the laws of {{party_b_state}} ("Party B")

(each a "Party" and collectively the "Parties").

## RECITALS

WHEREAS, the Parties wish to explore a potential business relationship concerning: {{purpose}} (the "Purpose"); and

WHEREAS, in connection with the Purpose, each Party may disclose to the other certain confidential and proprietary information;

NOW, THEREFORE, in consideration of the mutual covenants and agreements herein contained, the Parties agree as follows:

## 1. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any and all non-public information, in any form or medium, disclosed by one Party (the "Disclosing Party") to the other Party (the "Receiving Party"), including but not limited to:

(a) Trade secrets, inventions, ideas, processes, formulas, source code, data, programs, and other technical information;

(b) Business plans, financial information, customer lists, marketing strategies, and pricing information;

(c) Any other information that is marked as "confidential" or "proprietary" or that a reasonable person would understand to be confidential.

## 2. OBLIGATIONS OF RECEIVING PARTY

The Receiving Party agrees to:

(a) Hold the Confidential Information in strict confidence;

(b) Not disclose the Confidential Information to any third parties without the prior written consent of the Disclosing Party;

(c) Use the Confidential Information solely for the Purpose;

(d) Protect the Confidential Information using the same degree of care it uses to protect its own confidential information, but in no event less than reasonable care;

(e) Limit access to the Confidential Information to those employees, agents, and contractors who have a need to know and who are bound by confidentiality obligations at least as protective as those contained herein.

## 3. EXCLUSIONS

Confidential Information does not include information that:

(a) Is or becomes publicly available through no fault of the Receiving Party;

(b) Was rightfully in the Receiving Party's possession prior to disclosure;

(c) Is rightfully obtained by the Receiving Party from a third party without restriction;

(d) Is independently developed by the Receiving Party without use of the Confidential Information.

## 4. TERM

This Agreement shall remain in effect for {{term_years}} years from the Effective Date, unless earlier terminated by either Party upon thirty (30) days' written notice. The obligations of confidentiality shall survive termination and continue for {{confidentiality_period}} years thereafter.

## 5. RETURN OF INFORMATION

Upon termination of this Agreement or upon request by the Disclosing Party, the Receiving Party shall promptly return or destroy all Confidential Information and any copies thereof.

## 6. NO LICENSE

Nothing in this Agreement grants either Party any rights in or to the other Party's Confidential Information, except the limited right to use such information for the Purpose.

## 7. REMEDIES

Each Party acknowledges that any breach of this Agreement may cause irreparable harm for which monetary damages would be inadequate. Accordingly, the non-breaching Party shall be entitled to seek equitable relief, including injunction and specific performance, in addition to any other remedies available at law.

## 8. GOVERNING LAW

This Agreement shall be governed by and construed in accordance with the laws of the State of {{governing_state}}, without regard to its conflict of laws principles.

## 9. ENTIRE AGREEMENT

This Agreement constitutes the entire agreement between the Parties concerning the subject matter hereof and supersedes all prior agreements and understandings.

---

**IN WITNESS WHEREOF**, the Parties have executed this Agreement as of the Effective Date.

**{{party_a_name}}**

By: _________________________
Name: _______________________
Title: ________________________
Date: ________________________

**{{party_b_name}}**

By: _________________________
Name: _______________________
Title: ________________________
Date: ________________________
`;

// Independent Contractor Agreement Template Content
export const contractorAgreementContent = `# INDEPENDENT CONTRACTOR AGREEMENT

This Independent Contractor Agreement ("Agreement") is entered into as of {{start_date}} by and between:

**COMPANY:**
{{company_name}}
{{company_address}}
("Company")

**CONTRACTOR:**
{{contractor_name}}
{{#if contractor_business_name}}d/b/a {{contractor_business_name}}{{/if}}
{{contractor_address}}
("Contractor")

## 1. ENGAGEMENT

Company hereby engages Contractor, and Contractor hereby accepts engagement, to provide the services described herein as an independent contractor.

## 2. SERVICES

**2.1 Scope of Services.** Contractor agrees to provide the following services:

{{services_description}}

**2.2 Deliverables.** Contractor shall deliver the following:

{{deliverables}}

## 3. COMPENSATION

**3.1 Payment.** Company shall pay Contractor as follows:

{{#if payment_type_hourly}}
- Hourly rate of \${{rate_amount}} per hour
{{#if max_hours}}- Not to exceed {{max_hours}} hours without prior written approval{{/if}}
{{/if}}
{{#if payment_type_fixed}}
- Fixed project fee of \${{rate_amount}}
{{/if}}
{{#if payment_type_retainer}}
- Monthly retainer of \${{rate_amount}}
{{/if}}

**3.2 Payment Terms.** Payment shall be made {{payment_terms}} upon receipt of Contractor's invoice.

{{#if expense_reimbursement}}
**3.3 Expenses.** Company shall reimburse Contractor for pre-approved, reasonable business expenses{{#if expense_cap}}, not to exceed \${{expense_cap}}{{/if}}.
{{/if}}

## 4. TERM AND TERMINATION

**4.1 Term.** This Agreement shall commence on {{start_date}}{{#if end_date}} and continue until {{end_date}}{{else}} and continue until terminated by either party{{/if}}.

**4.2 Termination.** Either party may terminate this Agreement upon {{termination_notice}} days' written notice to the other party.

**4.3 Effect of Termination.** Upon termination, Contractor shall be paid for all services performed and expenses incurred through the date of termination.

## 5. INDEPENDENT CONTRACTOR STATUS

**5.1 Relationship.** Contractor is an independent contractor and not an employee, partner, or agent of Company. Contractor shall not be entitled to any employee benefits.

**5.2 Taxes.** Contractor is solely responsible for all taxes arising from compensation received under this Agreement. Company will provide Contractor with an IRS Form 1099 as required by law.

**5.3 Control.** Contractor retains the right to control the manner and means by which the services are performed, subject to the requirement that Contractor shall complete the services in accordance with the specifications set forth herein.

## 6. CONFIDENTIALITY

Contractor agrees to hold in confidence all proprietary and confidential information of Company and to use such information only for the purpose of performing services under this Agreement.

## 7. INTELLECTUAL PROPERTY

**7.1 Work Product.** All work product, inventions, and materials created by Contractor in the course of performing services under this Agreement shall be the sole and exclusive property of Company.

**7.2 Assignment.** Contractor hereby assigns to Company all right, title, and interest in and to any such work product.

## 8. REPRESENTATIONS AND WARRANTIES

Contractor represents and warrants that:

(a) Contractor has the right to enter into this Agreement;
(b) Contractor has the skills and experience necessary to perform the services;
(c) The services will be performed in a professional and workmanlike manner;
(d) The work product will not infringe any third-party intellectual property rights.

## 9. LIMITATION OF LIABILITY

IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF THIS AGREEMENT.

## 10. GOVERNING LAW

This Agreement shall be governed by and construed in accordance with the laws of the State of {{governing_state}}.

## 11. ENTIRE AGREEMENT

This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements and understandings.

---

**IN WITNESS WHEREOF**, the parties have executed this Agreement as of the date first written above.

**COMPANY:**

_________________________
{{company_name}}
By: ___________________
Title: _________________
Date: _________________

**CONTRACTOR:**

_________________________
{{contractor_name}}
Date: _________________
`;

// Consulting Services Agreement Template Content
export const consultingAgreementContent = `# CONSULTING SERVICES AGREEMENT

This Consulting Services Agreement ("Agreement") is entered into as of {{effective_date}} ("Effective Date") by and between:

**CLIENT:**
{{client_name}}
{{client_address}}
("Client")

**CONSULTANT:**
{{consultant_name}}
{{consultant_address}}
("Consultant")

## 1. ENGAGEMENT

Client hereby engages Consultant to provide consulting services for the project known as "{{project_name}}" (the "Project"), and Consultant hereby accepts such engagement, subject to the terms and conditions of this Agreement.

## 2. SCOPE OF SERVICES

**2.1 Services.** Consultant shall provide the following consulting services:

{{services_scope}}

{{#if key_personnel}}
**2.2 Key Personnel.** The following key personnel shall be assigned to the Project: {{key_personnel}}. Consultant shall not replace key personnel without Client's prior written consent.
{{/if}}

**2.3 Standard of Care.** Consultant shall perform all services in a professional manner consistent with industry standards and practices.

## 3. FEES AND PAYMENT

**3.1 Fees.** Client shall pay Consultant for services as follows:

{{#if fee_structure_time_materials}}
- Time and materials at an hourly rate of \${{hourly_rate}} per hour
- Estimated budget: \${{estimated_budget}} (not to be exceeded without prior written approval)
{{/if}}
{{#if fee_structure_fixed_fee}}
- Fixed fee of \${{fixed_fee_amount}} for the complete scope of services
{{/if}}
{{#if fee_structure_milestone}}
- Milestone-based payments as set forth in Exhibit A
- Total estimated budget: \${{estimated_budget}}
{{/if}}

**3.2 Invoicing.** Consultant shall submit invoices {{invoice_frequency}}. Client shall pay all undisputed amounts within thirty (30) days of receipt of invoice.

**3.3 Expenses.** Client shall reimburse Consultant for reasonable, pre-approved out-of-pocket expenses incurred in connection with the services.

## 4. TERM AND TERMINATION

**4.1 Term.** This Agreement shall commence on the Effective Date and continue for {{project_duration}} months, unless earlier terminated.

**4.2 Termination for Convenience.** Either party may terminate this Agreement upon thirty (30) days' written notice.

**4.3 Termination for Cause.** Either party may terminate this Agreement immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within fifteen (15) days of receiving notice.

**4.4 Effect of Termination.** Upon termination, Client shall pay Consultant for all services performed and expenses incurred through the date of termination.

## 5. CONFIDENTIALITY

**5.1 Confidential Information.** Each party agrees to maintain the confidentiality of the other party's confidential information and to use such information only for purposes of this Agreement.

**5.2 Exceptions.** Confidential information does not include information that: (a) is publicly available; (b) was known to the receiving party prior to disclosure; (c) is independently developed; or (d) is rightfully obtained from a third party.

## 6. INTELLECTUAL PROPERTY

**6.1 Work Product.** All deliverables, reports, and materials created by Consultant specifically for Client under this Agreement ("Work Product") shall be the property of Client upon full payment.

**6.2 Pre-Existing Materials.** Consultant retains ownership of all pre-existing materials, methodologies, and tools. Consultant grants Client a non-exclusive license to use such materials as incorporated into the Work Product.

## 7. REPRESENTATIONS AND WARRANTIES

**7.1 Consultant Warranties.** Consultant represents and warrants that:
(a) It has the authority to enter into this Agreement;
(b) The services will be performed in a professional manner;
(c) The Work Product will not infringe any third-party intellectual property rights.

**7.2 Disclaimer.** EXCEPT AS EXPRESSLY SET FORTH HEREIN, CONSULTANT MAKES NO OTHER WARRANTIES, EXPRESS OR IMPLIED.

## 8. LIMITATION OF LIABILITY

**8.1 Cap.** CONSULTANT'S TOTAL LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED THE FEES PAID BY CLIENT UNDER THIS AGREEMENT.

**8.2 Exclusion.** IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.

## 9. INDEMNIFICATION

Each party shall indemnify and hold harmless the other party from any third-party claims arising from the indemnifying party's breach of this Agreement or negligent acts.

## 10. GENERAL PROVISIONS

**10.1 Governing Law.** This Agreement shall be governed by the laws of the State of {{governing_state}}.

**10.2 Independent Contractor.** Consultant is an independent contractor and not an employee of Client.

**10.3 Entire Agreement.** This Agreement constitutes the entire agreement between the parties.

**10.4 Amendment.** This Agreement may only be amended in writing signed by both parties.

---

**IN WITNESS WHEREOF**, the parties have executed this Agreement as of the Effective Date.

**CLIENT:**

_________________________
{{client_name}}
By: ___________________
Title: _________________
Date: _________________

**CONSULTANT:**

_________________________
{{consultant_name}}
By: ___________________
Title: _________________
Date: _________________
`;

// Residential Lease Agreement Template Content
export const leaseAgreementContent = `# RESIDENTIAL LEASE AGREEMENT

This Residential Lease Agreement ("Lease") is entered into as of {{lease_start_date}} by and between:

**LANDLORD:**
{{landlord_name}}
{{landlord_address}}
("Landlord")

**TENANT:**
{{tenant_name}}
Phone: {{tenant_phone}}
Email: {{tenant_email}}
("Tenant")

## 1. PREMISES

Landlord hereby leases to Tenant, and Tenant hereby leases from Landlord, the following property:

**Property Address:** {{property_address}}

**Property Type:** {{property_type}}
**Bedrooms:** {{bedrooms}}
**Bathrooms:** {{bathrooms}}
{{#if furnished}}**Furnished:** Yes{{else}}**Furnished:** No{{/if}}
{{#if parking_included}}**Parking:** {{parking_spaces}} space(s) included{{else}}**Parking:** Not included{{/if}}

## 2. TERM

**2.1 Lease Term.** This Lease shall commence on {{lease_start_date}} and {{#if lease_type_fixed}}terminate on {{lease_end_date}}{{else}}continue on a month-to-month basis until terminated by either party with thirty (30) days' written notice{{/if}}.

## 3. RENT

**3.1 Monthly Rent.** Tenant agrees to pay Landlord monthly rent of **\${{monthly_rent}}**, due on the **{{rent_due_day}}** day of each month.

**3.2 Payment Method.** Rent shall be paid by check, money order, or electronic transfer to Landlord at the address above or as otherwise directed by Landlord.

**3.3 Late Fee.** If rent is not received within {{grace_period_days}} days of the due date, Tenant shall pay a late fee of **\${{late_fee}}**.

## 4. SECURITY DEPOSIT

**4.1 Amount.** Upon execution of this Lease, Tenant shall pay a security deposit of **\${{security_deposit}}**.

**4.2 Use.** The security deposit shall be held by Landlord as security for Tenant's performance of all obligations under this Lease.

**4.3 Return.** The security deposit, less any deductions for unpaid rent, damages beyond normal wear and tear, or cleaning costs, shall be returned to Tenant within the time period required by {{governing_state}} law after Tenant vacates the premises.

## 5. UTILITIES

{{#if utilities_included_all}}
**5.1** All utilities are included in the monthly rent.
{{/if}}
{{#if utilities_included_some}}
**5.1** The following utilities are included in the monthly rent: {{included_utilities_list}}. Tenant is responsible for all other utilities.
{{/if}}
{{#if utilities_included_none}}
**5.1** Tenant is responsible for all utilities including but not limited to electricity, gas, water, sewer, trash, internet, and cable.
{{/if}}

## 6. USE OF PREMISES

**6.1 Residential Use.** The premises shall be used solely for residential purposes and shall be occupied only by the following persons: {{tenant_name}}.

**6.2 Maximum Occupancy.** The maximum number of occupants shall not exceed {{max_occupants}} persons.

**6.3 Compliance.** Tenant shall comply with all applicable laws, ordinances, and regulations.

## 7. PETS

{{#if pets_allowed}}
**7.1** Pets are allowed on the premises subject to Landlord's prior written approval. A pet deposit of **\${{pet_deposit}}** is required.
{{else}}
**7.1** No pets are allowed on the premises without Landlord's prior written consent.
{{/if}}

## 8. SMOKING

{{#if smoking_allowed}}
**8.1** Smoking is permitted on the premises in designated areas only.
{{else}}
**8.1** Smoking is strictly prohibited on the premises, including all indoor and outdoor areas.
{{/if}}

## 9. MAINTENANCE AND REPAIRS

**9.1 Landlord Responsibilities.** Landlord shall maintain the premises in a habitable condition and make necessary repairs to the structure, plumbing, heating, and electrical systems.

**9.2 Tenant Responsibilities.** Tenant shall keep the premises clean and sanitary, dispose of garbage properly, and promptly notify Landlord of any needed repairs.

**9.3 Damage.** Tenant shall be responsible for any damage to the premises caused by Tenant, Tenant's guests, or Tenant's negligence.

## 10. ENTRY BY LANDLORD

Landlord may enter the premises for inspection, repairs, or showing to prospective tenants or buyers upon reasonable notice (at least 24 hours) except in case of emergency.

## 11. TERMINATION

**11.1 Notice.** {{#if lease_type_fixed}}At the end of the lease term, either party may terminate by providing written notice at least thirty (30) days before the end date.{{else}}Either party may terminate this month-to-month tenancy by providing written notice at least thirty (30) days before the intended termination date.{{/if}}

**11.2 Early Termination.** Tenant may not terminate this Lease early without Landlord's written consent. Early termination may result in forfeiture of the security deposit and liability for remaining rent.

## 12. DEFAULT

**12.1 Tenant Default.** If Tenant fails to pay rent or violates any term of this Lease, Landlord may pursue all remedies available under {{governing_state}} law, including eviction.

## 13. GOVERNING LAW

This Lease shall be governed by the laws of the State of {{governing_state}}.

## 14. ENTIRE AGREEMENT

This Lease constitutes the entire agreement between the parties and supersedes all prior agreements.

---

**IN WITNESS WHEREOF**, the parties have executed this Lease as of the date first written above.

**LANDLORD:**

_________________________
{{landlord_name}}
Date: _________________

**TENANT:**

_________________________
{{tenant_name}}
Date: _________________
`;
