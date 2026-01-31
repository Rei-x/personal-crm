import { createFileRoute } from "@tanstack/react-router";
import { useTRPC } from "@/lib/trpc";
import { differenceInDays, format } from "date-fns";
import { groupBy, prop, sortBy, uniqueBy } from "remeda";
import { ReceiptsPageSkeleton } from "@/components/skeletons";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/receipts")({
  component: Receipts,
  pendingComponent: ReceiptsPageSkeleton,
});

function Receipts() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.receipts.all.queryOptions());

  const allItems = data.receipts.flatMap((r) =>
    r.receiptItems.map((ri) => ({
      ...ri,
      receiptId: r.id,
      receiptDate: new Date(r.receiptDate ?? new Date()),
    }))
  );

  const groupedByItem = sortBy(
    Object.entries(
      groupBy(
        allItems.map((i) => {
          return {
            ...i,
            name: [...allItems].reverse().find((ai) => ai.code === i.code)?.name,
            originalName: i.name,
          };
        }),
        (r) => r.name
      )
    ).map(([name, items]) => {
      const sortedItems = sortBy(items, prop("receiptDate"));

      return {
        name,
        items: sortBy(items, prop("unitPrice")),
        count: items.length,
        countUntilLastBought: sortedItems.findIndex(
          (i) => i.receiptId === sortedItems[sortedItems.length - 1].receiptId
        ),
        timesBought: uniqueBy(items, prop("receiptId")).length,
        firstBoughtItem: sortedItems[0],
        lastBoughtItem: sortedItems[sortedItems.length - 1],
        sum: items.reduce(
          (acc, item) => acc + parseFloat(item.quantity) * parseFloat(item.unitPrice),
          0
        ),
      };
    }),
    [prop("sum"), "desc"]
  );

  return (
    <div>
      <h1>Paragony</h1>
      <div>
        <p>Propozycje:</p>
        <ul className="list-disc">
          {groupedByItem
            .filter(
              (i) =>
                differenceInDays(i.lastBoughtItem.receiptDate, i.firstBoughtItem.receiptDate) > 7 &&
                i.timesBought > 3
            )
            .map((item) => ({
              ...item,
              score:
                (item.count /
                  differenceInDays(
                    item.lastBoughtItem.receiptDate,
                    item.firstBoughtItem.receiptDate
                  )) *
                differenceInDays(new Date(), item.lastBoughtItem.receiptDate),
            }))
            .sort((a, b) => b.score - a.score)
            .map((item) => (
              <li className="ml-4" key={item.name}>
                <details>
                  <summary>
                    {item.name} - {item.score.toFixed(2)}
                  </summary>
                  <div>
                    <p>Times bought: {item.timesBought}</p>
                    <p>
                      Bought every:{" "}
                      {(
                        differenceInDays(
                          item.lastBoughtItem.receiptDate,
                          item.firstBoughtItem.receiptDate
                        ) / item.count
                      ).toFixed(2)}{" "}
                      days
                    </p>
                    <ol>
                      {item.items.map((item) => (
                        <li key={item.code}>
                          <details className="ml-2">
                            <summary>
                              {item.originalName} - {item.quantity} -{" "}
                              {item.receiptDate.toLocaleDateString()}
                            </summary>
                            <pre>{JSON.stringify(item, null, 2)}</pre>
                          </details>
                        </li>
                      ))}
                    </ol>
                  </div>
                </details>
              </li>
            ))}
        </ul>
      </div>
      <h2>Grupowane po produkcie</h2>
      <div>
        <p>Suma wszystkiego: </p>
        {groupedByItem.reduce((acc, item) => acc + item.sum, 0).toFixed(2)} zł
        <ul>
          {groupedByItem
            .filter(
              (i) =>
                differenceInDays(i.lastBoughtItem.receiptDate, i.firstBoughtItem.receiptDate) > 7
            )
            .map((item) => (
              <li key={item.name}>
                <details>
                  <summary>
                    {item.name} - {Math.round(item.sum)} zł - {item.firstBoughtItem.code}
                  </summary>
                  <div>
                    <p>
                      Count: {item.count}
                      <br /> First bought: {format(item.firstBoughtItem.receiptDate, "dd.MM.yyyy")},
                      <br /> Last bought: {format(
                        item.lastBoughtItem.receiptDate,
                        "dd.MM.yyyy"
                      )}{" "}
                      <br /> Items per week:{" "}
                      <b>
                        {(
                          (item.count /
                            differenceInDays(
                              item.lastBoughtItem.receiptDate,
                              item.firstBoughtItem.receiptDate
                            )) *
                          7
                        ).toFixed(2)}
                      </b>
                    </p>
                    <ol>
                      {item.items.map((item) => (
                        <li key={item.code}>
                          <details className="ml-2">
                            <summary>
                              {item.originalName} - {item.quantity} x {item.unitPrice}
                            </summary>
                            <pre>{JSON.stringify(item, null, 2)}</pre>
                          </details>
                        </li>
                      ))}
                    </ol>
                  </div>
                </details>
              </li>
            ))}
        </ul>
      </div>
      <div></div>
    </div>
  );
}
