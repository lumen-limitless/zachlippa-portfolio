"use client";
/* First make sure that you have installed the package */

/* If you are using yarn */
// yarn add @calcom/embed-react

/* If you are using npm */
// npm install @calcom/embed-react

import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";
import { Button } from "./ui/button";
export default function MyApp() {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace: "15min" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);
  return (
    <Button
      data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
      data-cal-link="lumen-limitless/15min"
      data-cal-namespace="15min"
    >
      Schedule Time
    </Button>
  );
}
