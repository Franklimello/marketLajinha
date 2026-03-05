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
  profile_image_url: z.string().trim().max(2048).optional(),
  about: z.string().trim().max(1500).optional(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  instagram: z.string().trim().max(120).optional(),
  address: z.string().trim().max(180).optional(),
  business_hours: z.string().trim().max(180).optional(),
});

module.exports = {
  schemaRegisterAccountType,
  schemaUpdateMe,
};
