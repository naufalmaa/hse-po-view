import React, {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {defaultStore} from "@/stores/useAppStore";
import {FormSelect} from "@/components/custom/forms";
import {Form} from "@/components/ui/form";
import {useAppTranslation, AppTranslation} from "@/lib/i18n-typed";

type Props = {
  form: any;
  onSubmit: any;
  setOpenFilter: any;
}

const ContainerFilter = ({form, onSubmit, setOpenFilter}: Props) => {
  const {t} = useAppTranslation();

  const [formList, setFormList] = useState<Record<string, any>>({
    onlyUnread: {
      name: "onlyUnread",
      label: t($ => $.notification.showOnlyUnreadNotifications),
      options: [
        {value: 'true', label: t($ => $.notification.yes)},
        {value: 'false', label: t($ => $.notification.no)},
      ]
    },
    orderBy: {
      name: "orderBy",
      label: t($ => $.notification.orderTriggeredOrder),
      options: [
        {value: "asc", label: t($ => $.notification.ascending)},
        {value: "desc", label: t($ => $.notification.descending)},
      ]
    }
  });

  const onSubmitClicked = () => {
    const data = {
      ...form.getValues(),
      onlyUnread: form.getValues("onlyUnread") === 'true',
    };
    onSubmit(form.getValues());
    setOpenFilter(false);
  }
  const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const resetData = {
      ...defaultStore.notificationList,
      onlyUnread: defaultStore.notificationList?.onlyUnread ? 'true' : 'false',
    };
    form.reset(resetData);
    onSubmit(form.getValues());
    setOpenFilter(false);
  }

  return (
    <div className={"flex flex-col gap-2"}>
      <div>
        <h4 className="leading-none font-medium">{t($ => $.notification.dailyReportFilter)}</h4>
        <p className="text-muted-foreground text-sm">
          {t($ => $.notification.setFilterForDailyReport)}
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitClicked)}
              className={"grid grid-cols-1 gap-4"}>
          <div className={""}>
            <FormSelect form={form} item={formList?.onlyUnread}/>
          </div>
          <div className={""}>
            <FormSelect form={form} item={formList?.orderBy}/>
          </div>
          <div className={"grid grid-cols-2 gap-2 mt-2"}>
            <Button variant={"destructive"} type="button" onClick={onResetClicked}>{t($ => $.shared.reset)}</Button>
            <Button type="submit">{t($ => $.shared.submit)}</Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
export default ContainerFilter