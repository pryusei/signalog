import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

import type {
  users,
  accounts,
  sessions,
  companies,
  companyFeeds,
  follows,
  articles,
} from '../../../db/schema'

export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>

export type Account = InferSelectModel<typeof accounts>
export type NewAccount = InferInsertModel<typeof accounts>

export type Session = InferSelectModel<typeof sessions>
export type NewSession = InferInsertModel<typeof sessions>

export type Company = InferSelectModel<typeof companies>
export type NewCompany = InferInsertModel<typeof companies>

export type CompanyFeed = InferSelectModel<typeof companyFeeds>
export type NewCompanyFeed = InferInsertModel<typeof companyFeeds>

export type Follow = InferSelectModel<typeof follows>
export type NewFollow = InferInsertModel<typeof follows>

export type Article = InferSelectModel<typeof articles>
export type NewArticle = InferInsertModel<typeof articles>
