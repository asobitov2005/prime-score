"use client";
import type { PromoCodesPageScope } from "./controller";
import { Button } from "../dependencies";
import { DateTimePickerField, addDaysToDateTimeInputValue, addMinutesToDateTimeInputValue } from "../shared";

export function PromoCodesPageSection24({ scope }: { scope: PromoCodesPageScope }) {
  const { startDate, setStartDate, currentDateTimeInputValue, endDate, setEndDate, effectiveStartDate, selectedPlan } = scope;
  return (
    <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-foreground">Start date</label>
                            <div className="space-y-3 rounded-2xl border border-border/50 bg-background/60 p-3">
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={startDate ? "outline" : "secondary"}
                                  className="w-full"
                                  onClick={() => setStartDate("")}
                                >
                                  Starts now
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={startDate ? "secondary" : "outline"}
                                  className="w-full"
                                  onClick={() => setStartDate((current) => current || currentDateTimeInputValue)}
                                >
                                  Schedule
                                </Button>
                              </div>
    
                              {startDate ? (
                                <>
                                  <DateTimePickerField
                                    value={startDate}
                                    onChange={setStartDate}
                                    minValue={currentDateTimeInputValue}
                                    placeholder="Select when this code becomes active"
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setStartDate(currentDateTimeInputValue)}>
                                      Next slot
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setStartDate(addMinutesToDateTimeInputValue(currentDateTimeInputValue, 60))}>
                                      +1 hour
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setStartDate(addDaysToDateTimeInputValue(currentDateTimeInputValue, 1))}>
                                      Tomorrow
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setStartDate(addDaysToDateTimeInputValue(currentDateTimeInputValue, 7))}>
                                      In 7 days
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <p className="text-[11px] text-muted-foreground">Code can be redeemed immediately after creation.</p>
                              )}
                            </div>
                          </div>
    
                          <div>
                            <label className="mb-2 block text-sm font-medium text-foreground">End date</label>
                            <div className="space-y-3 rounded-2xl border border-border/50 bg-background/60 p-3">
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={endDate ? "outline" : "secondary"}
                                  className="w-full"
                                  onClick={() => setEndDate("")}
                                >
                                  No expiry
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={endDate ? "secondary" : "outline"}
                                  className="w-full"
                                  onClick={() => setEndDate((current) => current || addDaysToDateTimeInputValue(effectiveStartDate, 7))}
                                >
                                  Set end date
                                </Button>
                              </div>
    
                              {endDate ? (
                                <>
                                  <DateTimePickerField
                                    value={endDate}
                                    onChange={setEndDate}
                                    minValue={effectiveStartDate}
                                    placeholder="Select when this code expires"
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setEndDate(addMinutesToDateTimeInputValue(effectiveStartDate, 60 * 24))}>
                                      +24 hours
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setEndDate(addDaysToDateTimeInputValue(effectiveStartDate, 7))}>
                                      +7 days
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setEndDate(addDaysToDateTimeInputValue(effectiveStartDate, 30))}>
                                      +30 days
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setEndDate(addDaysToDateTimeInputValue(effectiveStartDate, 60))}>
                                      +60 days
                                    </Button>
                                    {selectedPlan ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEndDate(addDaysToDateTimeInputValue(effectiveStartDate, selectedPlan.duration_days))}
                                      >
                                        Plan length
                                      </Button>
                                    ) : null}
                                  </div>
                                </>
                              ) : (
                                <p className="text-[11px] text-muted-foreground">Code stays valid until you revoke or pause it.</p>
                              )}
                            </div>
                          </div>
                        </div>
  );
}
