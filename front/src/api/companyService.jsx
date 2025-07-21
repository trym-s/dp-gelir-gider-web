import { createCrudService } from './serviceFactory';

// Create the company service using the generic factory
export const companyService = createCrudService('companies');