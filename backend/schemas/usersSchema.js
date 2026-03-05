const { z } = require('zod');

const accountTypeEnum = z.enum(['store', 'service']);

const schemaRegisterAccountType = z.object({
  accountType: accountTypeEnum,
  name: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().max(120).optional(),
});

const schemaUpdateMe = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().max(120).optional(),
  accountType: accountTypeEnum.optional(),
});

module.exports = {
  schemaRegisterAccountType,
  schemaUpdateMe,
};
