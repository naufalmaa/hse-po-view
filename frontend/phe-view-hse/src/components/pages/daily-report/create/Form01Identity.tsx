import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { formList } from "./lib/project-template";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { ControlForm } from "@/components/custom/forms";
import * as React from "react";
import { useEffect, useState } from "react";
import FormTitle from "@/components/pages/daily-report/create/components/FormTitle";
import { INSTANCE_TYPE, PROJECT_SUBTYPE, REPORT_TYPE, USER_ROLE } from "@/constants/app-enum";
import { APP_CONFIG } from "@/constants/config";
import { date_to_string } from "@/lib/my-utils";
import { isContractorString, isCrewString } from "@/types/auth";
import { MapPin, Plus, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkLocations, useCreateWorkLocation } from "@/service/work-location-api";
import { showNotifSuccess, showNotifError } from "@/lib/show-notif";

type Props = {
  formTitle?: string;
  formDescription?: string;
  onBackClick?: () => void;
  onSubmitClicked: (obj: Record<any, any>) => void;
  className?: string
  defaultValues?: Record<string, any>
  loading: boolean,
  disableEditing?: boolean,
  subTypes: any,
  userRole: string,
  showSaveButton?: boolean,
  parentForm?: any
}

export const createBodyParam = (body: Record<string, any>) => {
  return {
    ...body,
    reportDate: date_to_string(body?.reportDate, APP_CONFIG.dayFormat),
  }
}

const Form01Identity = ({
  formTitle, formDescription,
  onBackClick, onSubmitClicked, className, defaultValues, loading, disableEditing = false,
  userRole,
  subTypes, showSaveButton = true, parentForm
}: Props) => {
  // Initialize form data with options
  const [formData, setFormData] = useState(() => {
    const initialData = { ...formList?.identity };

    // Initialize options based on user role
    if (initialData?.form) {

      let optionInstansi = [];
      if (isContractorString(userRole)) {
        optionInstansi = [{ label: "Kontraktor", value: "Kontraktor" }];
      }
      else if (isCrewString(userRole)) {
        optionInstansi = [{ label: "Crew", value: "crew" }];
      }
      else {
        optionInstansi = [{ label: "PHE OSES", value: "PHE OSES" }];
      }

      // if (defaultValues?.id !== "") {
      //   optionInstansi = [{ label: "PHE OSES", value: "PHE OSES" }, { label: "Crew", value: "crew" }, { label: "Kontraktor", value: "Kontraktor" }]
      // }

      initialData.form = {
        ...initialData.form,
        instansi: {
          ...initialData.form.instansi,
          options: optionInstansi
        },
        formType: {
          ...initialData.form.formType,
          options: isContractorString(userRole) ? Object.values(REPORT_TYPE).filter(item => item.value !== REPORT_TYPE["project"].value)
            : (isCrewString(userRole) ? [{ label: "Marine", value: "marine" }] : Object.values(REPORT_TYPE))
        },
        subtype: {
          ...initialData.form.subtype,
          options: subTypes || []
        }
      };
    }
    return initialData;
  });

  // Initialize form with default values
  const form = parentForm || useForm<any>({
    resolver: zodResolver(z.object(formData?.schema)),
    defaultValues: {
      ...formData?.defaultValue,
      ...(defaultValues || {}),
      reportDate: defaultValues?.reportDate ? new Date(defaultValues.reportDate) : new Date(),
    },
  });

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      form: {
        ...prev.form,
        subtype: {
          ...prev.form?.subtype,
          options: subTypes,
        }
      }
    }));
  }, [subTypes]);

  // Update form when defaultValues or subTypes change
  useEffect(() => {
    if (!defaultValues || !subTypes) return;

    let subtype = '';
    if (defaultValues?.subtypeName) {
      const selectedSubType = subTypes.find((item: any) => item.label === defaultValues.subtypeName);
      subtype = selectedSubType?.value ?? defaultValues.subtype ?? '';
    }

    // Check if instansi has default value of "crew"
    let optionInstansi = [];
    if (isContractorString(userRole)) {
      optionInstansi = [{ label: "Kontraktor", value: "Kontraktor" }];
    }
    else if (isCrewString(userRole)) {
      optionInstansi = [{ label: "Crew", value: "crew" }];
    }
    else {
      optionInstansi = [{ label: "PHE OSES", value: "PHE OSES" }];
    }

    if (defaultValues?.id !== "") {
      optionInstansi = [{ label: "PHE OSES", value: "PHE OSES" }, { label: "Crew", value: "crew" }, { label: "Kontraktor", value: "Kontraktor" }]
    }

    setFormData(prev => ({
      ...prev,
      form: {
        ...prev.form,
        instansi: {
          ...prev.form?.instansi,
          options: optionInstansi
        },
        subtype: {
          ...prev.form?.subtype,
          options: subTypes,
        }
      }
    }));

    setTimeout(() => {
      form.reset({
        ...form.getValues(),
        ...defaultValues,
        reportDate: defaultValues.reportDate ? new Date(defaultValues.reportDate) : new Date(),
        subtype: subtype,
        workLocationId: defaultValues?.workLocationId ?? '',
      });
    }, 100);
  }, [defaultValues, subTypes, userRole]);

  const onSubmitClicked_ = (body: Record<string, any>) => {
    const newBody = {
      reportDate: body?.reportDate,
      reportedBy: body?.reportedBy ?? "",
      instansi: body?.instansi ?? "",
      formType: body?.formType ?? "",
      subtype: body?.subtype ?? "",
      workLocationId: body?.workLocationId || null,
    }
    onSubmitClicked(createBodyParam(newBody));
  }

  const formType = form.watch("formType");
  const instansiValue = form.watch("instansi");
  const selectedSubtype = form.watch("subtype");

  const { data: workLocations, refetch: refetchWorkLocations } = useWorkLocations(selectedSubtype);
  const createWorkLocationMutation = useCreateWorkLocation();
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationLat, setNewLocationLat] = useState("");
  const [newLocationLng, setNewLocationLng] = useState("");
  const [gettingCoordinates, setGettingCoordinates] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      showNotifError({ message: "Geolocation tidak didukung oleh browser Anda" });
      return;
    }
    setGettingCoordinates(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewLocationLat(pos.coords.latitude.toFixed(6));
        setNewLocationLng(pos.coords.longitude.toFixed(6));
        setGettingCoordinates(false);
        showNotifSuccess({ message: "Koordinat berhasil diambil dari lokasi saat ini" });
      },
      (err) => {
        setGettingCoordinates(false);
        showNotifError({ message: "Gagal mengambil lokasi: " + err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Check if instansi has default value of "crew"
  const isDisableEditing = (defaultValues?.id || "") !== "";

  if (formType === "marine") {
    form.setValue("subtype", PROJECT_SUBTYPE.GCU.value);
  }

  return (
    <div>
      <FormTitle form={form} title={formTitle} description={formDescription} onSubmitClicked={onSubmitClicked_}
        disabled={loading} showSaveButton={showSaveButton} />
      <div className={"flex flex-col gap-4 py-1"}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitClicked_)} className={className} onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}>
            <ControlForm form={form} item={formData?.form?.reportDate} disabled={loading} />
            <ControlForm form={form} item={formData?.form?.reportedBy} disabled={loading} />
            <ControlForm form={form} item={formData?.form?.instansi} disabled={loading || isDisableEditing} />
            <ControlForm form={form} item={formData?.form?.formType} disabled={loading || disableEditing} />
            {(formType === "project") && (
              <>
                <ControlForm form={form} item={formData?.form?.subtype} disabled={loading} />

                {selectedSubtype && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl border bg-muted/20">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>Work Location</span>
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                        onClick={() => setIsAddingLocation(!isAddingLocation)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {isAddingLocation ? "Tutup Form" : "Tambahkan Work Location"}
                      </Button>
                    </div>

                    {isAddingLocation ? (
                      <div className="mt-1 space-y-2 p-3 bg-background rounded-lg border">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground">Tambah Work Location Baru</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-[11px] flex items-center gap-1 text-primary border-primary/30 hover:bg-primary/10"
                            onClick={handleGetCurrentLocation}
                            disabled={gettingCoordinates}
                          >
                            <Navigation className="h-3 w-3" />
                            {gettingCoordinates ? "Mencari GPS..." : "Gunakan Koordinat Lokasi Saat Ini"}
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Input
                            placeholder="Nama Lokasi (Wajib)"
                            value={newLocationName}
                            onChange={(e) => setNewLocationName(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Latitude (opsional)"
                            type="number"
                            step="any"
                            value={newLocationLat}
                            onChange={(e) => setNewLocationLat(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Longitude (opsional)"
                            type="number"
                            step="any"
                            value={newLocationLng}
                            onChange={(e) => setNewLocationLng(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setIsAddingLocation(false)}
                          >
                            Batal
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={async () => {
                              if (!newLocationName.trim()) {
                                showNotifError({ message: "Nama lokasi wajib diisi" });
                                return;
                              }
                              try {
                                const result = await createWorkLocationMutation.mutateAsync({
                                  projectId: selectedSubtype,
                                  name: newLocationName.trim(),
                                  latitude: newLocationLat ? parseFloat(newLocationLat) : null,
                                  longitude: newLocationLng ? parseFloat(newLocationLng) : null,
                                });
                                await refetchWorkLocations();
                                if (result?.id) {
                                  form.setValue("workLocationId", result.id);
                                }
                                setIsAddingLocation(false);
                                setNewLocationName("");
                                setNewLocationLat("");
                                setNewLocationLng("");
                                showNotifSuccess({ message: "Work Location berhasil ditambahkan" });
                              } catch (err: any) {
                                showNotifError({ message: err?.message || "Gagal menambahkan lokasi" });
                              }
                            }}
                            disabled={createWorkLocationMutation.isPending}
                          >
                            {createWorkLocationMutation.isPending ? "Menyimpan..." : "Simpan Lokasi"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <select
                        {...form.register("workLocationId")}
                        disabled={loading}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">-- Pilih Work Location (Opsional) --</option>
                        {(workLocations || []).map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} {loc.latitude && loc.longitude ? `(${loc.latitude}, ${loc.longitude})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </>
            )}
          </form>
        </Form>
      </div>
    </div>
  )
}
export default Form01Identity