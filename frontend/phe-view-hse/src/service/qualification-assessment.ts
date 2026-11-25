import {useMutation, useQuery} from "@tanstack/react-query";
import {fetchApi} from "@/lib/fetch-api";
import {AppApi} from "@/constants/app-api";

export const useQualificationAssessmentGet = () => {
  return useQuery({
    queryKey: ['qualification-assessment-list'],
    queryFn: async () => {
      const response = await fetchApi({method: "GET", url: `${AppApi.csms.qualificationAssessment.list}`, withCredentials: true});
      return(response?.data)
    },
  });
}

export const useQualificationAssessmentPost = () => {
  return useMutation({
    mutationKey: ['qualification-assessment-post'],
    mutationFn: async ({body}: {body: any }) => {
      return await fetchApi({method: "POST", url: `${AppApi.csms.qualificationAssessment.create}`, body: body, withCredentials: true, headers: {'Content-Type': 'multipart/form-data'}});
    },
  });
}

export const useQualificationAssessmentCrud = () => {
  return useMutation({
    mutationKey: ['qualification-assessment-crud'],
    mutationFn: async ({body}: {body: any }) => {
      return await fetchApi({method: "PATCH", url: `${AppApi.csms.qualificationAssessment.update}`, body: body, withCredentials: true, headers: {'Content-Type': 'multipart/form-data'}});
    },
  });
}

export const useQualificationAssessmentDelete = () => {
  return useMutation({
    mutationKey: ['qualification-assessment-delete'],
    mutationFn: async ({id}: {id: string}) => {
      return await fetchApi({method: "DELETE", url: `${AppApi.csms.qualificationAssessment.crud}/${id}`, withCredentials: true});
    },
  });
}

export const useQualificationAssessmentDeleteAssets = () => {
  return useMutation({
    mutationKey: ['qualification-assessment-delete-assets'],
    mutationFn: async ({body}: {body: Record<string, any>}) => {
      return await fetchApi({method: "DELETE", url: `${AppApi.csms.qualificationAssessment.deleteAssets}`, body: body, withCredentials: true});
    },
  });
}