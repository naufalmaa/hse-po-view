import {Separator} from "@/components/ui/separator";
import * as React from "react";
import {Button} from "@/components/ui/button";
import {UseFormReturn} from "react-hook-form";
import {Loader2} from "lucide-react";
import {LuSave} from "react-icons/lu";
import {cn} from "@/lib/utils";

type Props = {
  form: UseFormReturn<any>;
  title?: string,
  description?: string,
  onSubmitClicked?(obj: Record<any, any>): void;
  disabled?: boolean,
  showSaveButton?: boolean,
  children?: React.ReactNode,
}
const FormTitle = ({form, title, description, onSubmitClicked, disabled, showSaveButton = true, children}: Props) => {

  const onNextClick_ = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      if (onSubmitClicked) {
        onSubmitClicked(form.getValues());
      }
    }
  }

  return (
    <div className="">
      {/* Header Section */}
      <div className="flex flex-row gap-4 justify-between items-start pb-2">
        <div className="flex-1 space-y-1">
          {/* Title */}
          <h2 className={cn(
            "font-semibold text-xl text-foreground",
            "leading-tight"
          )}>
            {title}
          </h2>

          {/* Description */}
          {description && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Save Button */}
        <div className={"flex flex-row gap-2"}>
          {children}
          {showSaveButton && (
            <div className="flex flex-row flex-shrink-0 gap-2">
              <Button
                disabled={disabled}
                onClick={(e) => {
                  if (onSubmitClicked) {
                    e.preventDefault();
                    onNextClick_().then(() => {
                    })
                  }
                }}
              >
                {disabled ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    Saving...
                  </>
                ) : (
                  <>
                    <LuSave className="mr-2 h-4 w-4"/>
                    Save
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Simple Separator */}
      <Separator className="bg-border my-1"/>
    </div>
  )
}
export default FormTitle;