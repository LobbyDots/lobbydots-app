import {
  type ConsumeInviteInput,
  consumeInviteResponseSchema,
  type CreateRequestInput,
  createInviteResponseSchema,
  createRequestSchema,
  type ImportContactsInput,
  importContactsResponseSchema,
  introDetailSchema,
  type IntroDetail,
  introSchema,
  type Member,
  memberSchema,
  type OpenRequest,
  openRequestSchema,
  type OwnContact,
  ownContactSchema,
  pathsResponseSchema,
  type ProposeIntroInput,
  type RequestDto,
  requestSchema,
  type SetTiersInput,
  setTiersResponseSchema,
  type UpdateMeInput,
  voucherInfoSchema,
} from "@lobbydots/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "./client";

const ownContactsSchema = z.array(ownContactSchema);
const requestsSchema = z.array(requestSchema);
const openRequestsSchema = z.array(openRequestSchema);
const introsSchema = z.array(introDetailSchema);
const okSchema = z.object({ ok: z.boolean() });

// ── Invitaciones / miembro ──
export function useVoucher(token: string) {
  return useQuery({
    queryKey: ["voucher", token],
    queryFn: () => api.get(`/invites/${token}/voucher`, voucherInfoSchema, false),
    enabled: token.length > 0,
    retry: false,
  });
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get("/me", memberSchema),
    enabled,
    retry: false,
  });
}

export function useCreateInvite() {
  return useMutation({
    mutationFn: () => api.post("/invites", undefined, createInviteResponseSchema),
  });
}

export function useConsumeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { token: string; input: ConsumeInviteInput }) =>
      api.post(
        `/invites/${vars.token}/consume`,
        vars.input,
        consumeInviteResponseSchema,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMeInput) => api.patch("/me", input, memberSchema),
    onSuccess: (m: Member) => qc.setQueryData(["me"], m),
  });
}

export function useRegisterPushToken() {
  return useMutation({
    mutationFn: (expoPushToken: string) =>
      api.post("/me/push-token", { expoPushToken }, okSchema),
  });
}

// ── Contactos / tiers ──
export function useOwnContacts(enabled = true) {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: () => api.get("/contacts", ownContactsSchema),
    enabled,
  });
}

export function useImportContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportContactsInput) =>
      api.post("/contacts/import", input, importContactsResponseSchema),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useSetTiers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetTiersInput) =>
      api.patch("/contacts/tiers", input, setTiersResponseSchema),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

// ── Peticiones / caminos ──
export function useRequests(enabled = true) {
  return useQuery({
    queryKey: ["requests"],
    queryFn: () => api.get("/requests", requestsSchema),
    enabled,
  });
}

/** Peticiones por descripción que puedo ayudar a resolver (pull). */
export function useOpenRequests(enabled = true) {
  return useQuery({
    queryKey: ["openRequests"],
    queryFn: () => api.get("/requests/open", openRequestsSchema),
    enabled,
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRequestInput) =>
      api.post("/requests", input, requestSchema),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requests"] }),
  });
}

export function usePaths(requestId: string) {
  return useQuery({
    queryKey: ["paths", requestId],
    queryFn: () => api.get(`/requests/${requestId}/paths`, pathsResponseSchema),
    enabled: requestId.length > 0,
    retry: false,
  });
}

// ── Intros ──
export function useIntros(enabled = true) {
  return useQuery({
    queryKey: ["intros"],
    queryFn: () => api.get("/intros", introsSchema),
    enabled,
  });
}

export function useIntro(introId: string) {
  return useQuery({
    queryKey: ["intro", introId],
    queryFn: () => api.get(`/intros/${introId}`, introDetailSchema),
    enabled: introId.length > 0,
    retry: false,
  });
}

export function useProposeIntro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProposeIntroInput) =>
      api.post("/intros", input, introSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intros"] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

/** Por descripción: ofrecerse como intermediario de una petición. */
export function useVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      api.post("/intros/volunteer", { requestId }, introSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["openRequests"] });
      qc.invalidateQueries({ queryKey: ["intros"] });
    },
  });
}

export function useApproveIntro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (introId: string) =>
      api.post(`/intros/${introId}/approve`, undefined, introDetailSchema),
    onSuccess: (_data: IntroDetail, introId: string) => {
      qc.invalidateQueries({ queryKey: ["intro", introId] });
      qc.invalidateQueries({ queryKey: ["intros"] });
    },
  });
}

export function useRejectIntro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (introId: string) =>
      api.post(`/intros/${introId}/reject`, undefined, introSchema),
    onSuccess: (_data, introId: string) => {
      qc.invalidateQueries({ queryKey: ["intro", introId] });
      qc.invalidateQueries({ queryKey: ["intros"] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

export function useCompleteIntro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (introId: string) =>
      api.post(`/intros/${introId}/complete`, undefined, introSchema),
    onSuccess: (_data, introId: string) => {
      qc.invalidateQueries({ queryKey: ["intro", introId] });
      qc.invalidateQueries({ queryKey: ["intros"] });
    },
  });
}

export type { OwnContact, RequestDto, IntroDetail, OpenRequest };
