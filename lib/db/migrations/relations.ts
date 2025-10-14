import { relations } from "drizzle-orm/relations";
import { businessPlans, emailEvents, leads, conversations, users, analyticsEvents, messages, fileUploads, systemHealth, websiteAnalyses } from "./schema";

export const emailEventsRelations = relations(emailEvents, ({one}) => ({
	businessPlan: one(businessPlans, {
		fields: [emailEvents.businessPlanId],
		references: [businessPlans.id]
	}),
	lead: one(leads, {
		fields: [emailEvents.leadId],
		references: [leads.id]
	}),
}));

export const businessPlansRelations = relations(businessPlans, ({one, many}) => ({
	emailEvents: many(emailEvents),
	conversation: one(conversations, {
		fields: [businessPlans.conversationId],
		references: [conversations.id]
	}),
	user: one(users, {
		fields: [businessPlans.userId],
		references: [users.id]
	}),
	leads: many(leads),
}));

export const leadsRelations = relations(leads, ({one, many}) => ({
	emailEvents: many(emailEvents),
	businessPlan: one(businessPlans, {
		fields: [leads.businessPlanId],
		references: [businessPlans.id]
	}),
	conversation: one(conversations, {
		fields: [leads.conversationId],
		references: [conversations.id]
	}),
	user: one(users, {
		fields: [leads.userId],
		references: [users.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	businessPlans: many(businessPlans),
	leads: many(leads),
	analyticsEvents: many(analyticsEvents),
	messages: many(messages),
	fileUploads: many(fileUploads),
	systemHealths: many(systemHealth),
	websiteAnalyses: many(websiteAnalyses),
	user: one(users, {
		fields: [conversations.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	businessPlans: many(businessPlans),
	leads: many(leads),
	analyticsEvents: many(analyticsEvents),
	fileUploads: many(fileUploads),
	systemHealths: many(systemHealth),
	websiteAnalyses: many(websiteAnalyses),
	conversations: many(conversations),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({one}) => ({
	conversation: one(conversations, {
		fields: [analyticsEvents.conversationId],
		references: [conversations.id]
	}),
	user: one(users, {
		fields: [analyticsEvents.userId],
		references: [users.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
}));

export const fileUploadsRelations = relations(fileUploads, ({one}) => ({
	conversation: one(conversations, {
		fields: [fileUploads.conversationId],
		references: [conversations.id]
	}),
	user: one(users, {
		fields: [fileUploads.userId],
		references: [users.id]
	}),
}));

export const systemHealthRelations = relations(systemHealth, ({one}) => ({
	conversation: one(conversations, {
		fields: [systemHealth.conversationId],
		references: [conversations.id]
	}),
	user: one(users, {
		fields: [systemHealth.userId],
		references: [users.id]
	}),
}));

export const websiteAnalysesRelations = relations(websiteAnalyses, ({one}) => ({
	conversation: one(conversations, {
		fields: [websiteAnalyses.conversationId],
		references: [conversations.id]
	}),
	user: one(users, {
		fields: [websiteAnalyses.userId],
		references: [users.id]
	}),
}));