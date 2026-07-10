import { fetchAdminApi } from "./speaking-api-dependencies";
import { ListSpeakingTopicParams, SpeakingCategory, SpeakingCategoryCreateInput, SpeakingCategoryListResponse, SpeakingTopic, SpeakingTopicCreateInput, SpeakingTopicListResponse, SpeakingTopicUpdateInput, baseUrl, jsonHeaders } from "./speaking-api-part-01";
import { handleJson } from "./speaking-api-part-02";

export const speakingApi = {
  async listCategories(): Promise<SpeakingCategoryListResponse> {
    const response = await fetchAdminApi(`${baseUrl}/speaking/categories`, {
      cache: "no-store",
    });
    return handleJson<SpeakingCategoryListResponse>(response);
  },

  async createCategory(input: SpeakingCategoryCreateInput): Promise<SpeakingCategory> {
    const response = await fetchAdminApi(`${baseUrl}/speaking/categories`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    });
    return handleJson<SpeakingCategory>(response);
  },

  async deleteCategory(slug: string): Promise<void> {
    const response = await fetchAdminApi(`${baseUrl}/speaking/categories/${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const body = await response.json();
        if (body?.detail) {
          detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
        }
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
  },

  async listTopics(params: ListSpeakingTopicParams = {}): Promise<SpeakingTopicListResponse> {
    const query = new URLSearchParams();
    if (params.part_number) query.set("part_number", String(params.part_number));
    if (params.category) query.set("category", params.category);
    const qs = query.toString();
    const response = await fetchAdminApi(`${baseUrl}/speaking/topics${qs ? `?${qs}` : ""}`, {
      cache: "no-store",
    });
    return handleJson<SpeakingTopicListResponse>(response);
  },

  async createTopic(input: SpeakingTopicCreateInput): Promise<SpeakingTopic> {
    const response = await fetchAdminApi(`${baseUrl}/speaking/topics`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    });
    return handleJson<SpeakingTopic>(response);
  },

  async updateTopic(id: string, input: SpeakingTopicUpdateInput): Promise<SpeakingTopic> {
    const response = await fetchAdminApi(`${baseUrl}/speaking/topics/${id}`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify(input),
    });
    return handleJson<SpeakingTopic>(response);
  },

  async deleteTopic(id: string): Promise<void> {
    const response = await fetchAdminApi(`${baseUrl}/speaking/topics/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const body = await response.json();
        if (body?.detail) {
          detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
        }
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
  },
};
