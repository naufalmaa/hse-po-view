import React from "react";
import { ControlForm } from "@/components/custom/forms";
import { useAppTranslation } from "@/lib/i18n-typed";
import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Plus, Trash2, MapPin, Navigation, HelpCircle } from "lucide-react";
import { showNotifSuccess, showNotifError } from "@/lib/show-notif";

type Props = {
  values: any; // or better: Record<string, any>
  form: any;   // ideally typed from useForm<...>
  showPassword?: boolean;
  readOnly?: boolean;
};

const FormEdit = ({ values, form, showPassword = true, ...props }: any) => {
  const { t } = useAppTranslation();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "workLocations",
  });

  const handleGetCoordinatesForRow = (index: number) => {
    if (!navigator.geolocation) {
      showNotifError({ message: "Geolocation tidak didukung oleh browser Anda" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue(`workLocations.${index}.latitude`, pos.coords.latitude.toFixed(6));
        form.setValue(`workLocations.${index}.longitude`, pos.coords.longitude.toFixed(6));
        showNotifSuccess({ message: `Koordinat baris ${index + 1} berhasil diambil dari lokasi saat ini` });
      },
      (err) => {
        showNotifError({ message: "Gagal mengambil lokasi: " + err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAppendWithCurrentLocation = () => {
    if (!navigator.geolocation) {
      append({ name: "", latitude: "", longitude: "" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        append({
          name: "",
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        });
        showNotifSuccess({ message: "Work Location ditambahkan dengan koordinat saat ini" });
      },
      (err) => {
        append({ name: "", latitude: "", longitude: "" });
        showNotifError({ message: "Gagal mengambil lokasi: " + err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={"flex flex-col gap-4 w-full"}>
      {/* name */}
      <ControlForm form={form} item={values?.name} showMessage={false} />
      {/* hoursPobPheOses */}
      <ControlForm form={form} item={values?.hoursPobPheOses} showMessage={false} />
      {/* hoursPobContractor */}
      <ControlForm form={form} item={values?.hoursPobContractor} showMessage={false} />
      {/* target */}
      <ControlForm form={form} item={values?.target} showMessage={false} />

      {/* autoCalculateManhours Switch with Tooltip */}
      <div className="flex items-center justify-between border rounded-md p-3 bg-muted/10">
        <div className="flex items-center gap-1.5">
          <label htmlFor="autoCalculateManhours" className="text-sm font-medium text-foreground cursor-pointer">
            {t($ => $.subTypes.autoCalculateManhours)}
          </label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {t($ => $.subTypes.autoCalculateTooltip)}
            </TooltipContent>
          </Tooltip>
        </div>
        <Switch
          id="autoCalculateManhours"
          checked={form.watch("autoCalculateManhours") ?? true}
          onCheckedChange={(checked) => form.setValue("autoCalculateManhours", checked)}
        />
      </div>

      {/* Work Location Section */}
      <div className="flex flex-col gap-2 border rounded-md p-3 bg-muted/20 mt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Work Location</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs flex items-center gap-1 text-primary border-primary/30 hover:bg-primary/10"
              onClick={handleAppendWithCurrentLocation}
            >
              <Navigation className="h-3 w-3" />
              Gunakan Koordinat Saat Ini
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs flex items-center gap-1"
              onClick={() => append({ name: "", latitude: "", longitude: "" })}
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Baris
            </Button>
          </div>
        </div>

        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">
            Belum ada Work Location yang ditambahkan (opsional).
          </p>
        ) : (
          <div className="flex flex-col gap-2 mt-1">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-0.5">
              <span className="col-span-4">Nama Lokasi</span>
              <span className="col-span-3">Latitude</span>
              <span className="col-span-3">Longitude</span>
              <span className="col-span-2 text-center">Aksi</span>
            </div>
            {fields.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <Input
                    {...form.register(`workLocations.${index}.name`)}
                    placeholder="Nama Lokasi"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    {...form.register(`workLocations.${index}.latitude`)}
                    placeholder="-5.1234"
                    className="h-8 text-xs"
                    type="number"
                    step="any"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    {...form.register(`workLocations.${index}.longitude`)}
                    placeholder="106.1234"
                    className="h-8 text-xs"
                    type="number"
                    step="any"
                  />
                </div>
                <div className="col-span-2 flex justify-center items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                    title="Gunakan Koordinat Lokasi Saat Ini"
                    onClick={() => handleGetCoordinatesForRow(index)}
                  >
                    <Navigation className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    title="Hapus Lokasi"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default FormEdit;
