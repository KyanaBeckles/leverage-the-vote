import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Approximate coordinates for major Massachusetts cities/towns
const MA_CITY_COORDS = {
  "boston": [42.3601, -71.0589],
  "worcester": [42.2626, -71.8023],
  "springfield": [42.1015, -72.5898],
  "cambridge": [42.3736, -71.1097],
  "lowell": [42.6334, -71.3162],
  "brockton": [42.0834, -71.0184],
  "new bedford": [41.6362, -70.9342],
  "fall river": [41.7015, -71.1550],
  "lynn": [42.4668, -70.9495],
  "quincy": [42.2529, -71.0023],
  "newton": [42.3370, -71.2092],
  "somerville": [42.3876, -71.0995],
  "lawrence": [42.7070, -71.1631],
  "waltham": [42.3765, -71.2356],
  "haverhill": [42.7762, -71.0773],
  "malden": [42.4251, -71.0662],
  "medford": [42.4184, -71.1062],
  "taunton": [41.9001, -71.0898],
  "chicopee": [42.1487, -72.6079],
  "weymouth": [42.2210, -70.9411],
  "revere": [42.4084, -71.0120],
  "peabody": [42.5279, -70.9287],
  "methuen": [42.7262, -71.1909],
  "barnstable": [41.7003, -70.3002],
  "pittsfield": [42.4501, -73.2620],
  "attleboro": [41.9445, -71.2856],
  "arlington": [42.4154, -71.1565],
  "everett": [42.4084, -71.0537],
  "salem": [42.5195, -70.8967],
  "westfield": [42.1501, -72.7495],
  "leominster": [42.5251, -71.7598],
  "beverly": [42.5584, -70.8800],
  "fitchburg": [42.5834, -71.8023],
  "holyoke": [42.2043, -72.6162],
  "marlborough": [42.3487, -71.5523],
  "chelsea": [42.3918, -71.0328],
  "woburn": [42.4793, -71.1523],
  "braintree": [42.2040, -71.0020],
  "concord": [42.4604, -71.3495],
  "framingham": [42.2793, -71.4162],
  "natick": [42.2837, -71.3468],
  "needham": [42.2793, -71.2362],
  "norwood": [42.1943, -71.1995],
  "randolph": [42.1626, -71.0423],
  "canton": [42.1587, -71.1456],
  "stoughton": [42.1234, -71.1006],
  "dedham": [42.2418, -71.1662],
  "walpole": [42.1501, -71.2495],
  "sharon": [42.1237, -71.1784],
  "milton": [42.2501, -71.0662],
  "hull": [42.3001, -70.9234],
  "hingham": [42.2404, -70.8900],
  "rockland": [42.1284, -70.9106],
  "abington": [42.1051, -70.9456],
  "bridgewater": [41.9901, -70.9745],
  "east bridgewater": [42.0334, -70.9373],
  "west bridgewater": [42.0034, -71.0023],
  "middleborough": [41.8887, -70.9120],
  "wareham": [41.7626, -70.7148],
  "plymouth": [41.9584, -70.6673],
  "kingston": [41.9837, -70.7295],
  "duxbury": [42.0418, -70.6712],
  "marshfield": [42.0918, -70.7073],
  "scituate": [42.1987, -70.7484],
  "cohasset": [42.2418, -70.8062],
  "hanover": [42.1151, -70.8145],
  "pembroke": [42.0651, -70.8101],
  "hanson": [42.0584, -70.8728],
  "whitman": [42.0818, -70.9323],
  "holbrook": [42.1501, -71.0101],
  "avon": [42.1284, -71.0284],
  "stoughton": [42.1234, -71.1006],
  "canton": [42.1587, -71.1456],
  "westwood": [42.2184, -71.2134],
  "dover": [42.2337, -71.2823],
  "medfield": [42.1868, -71.3062],
  "millis": [42.1668, -71.3584],
  "milford": [42.1401, -71.5195],
  "hopkinton": [42.2284, -71.5223],
  "ashland": [42.2601, -71.4634],
  "holliston": [42.2001, -71.4334],
  "medway": [42.1568, -71.3934],
  "franklin": [42.0834, -71.3956],
  "bellingham": [42.0851, -71.4745],
  "wrentham": [42.0534, -71.3451],
  "foxborough": [42.0651, -71.2462],
  "mansfield": [42.0001, -71.2184],
  "norton": [41.9701, -71.1856],
  "easton": [42.0234, -71.1284],
  "raynham": [41.9351, -71.0512],
  "dighton": [41.8151, -71.1256],
  "berkley": [41.8384, -71.0784],
  "lakeville": [41.8384, -70.9523],
  "freetown": [41.7801, -71.0162],
  "swansea": [41.7518, -71.2112],
  "rehoboth": [41.8434, -71.2423],
  "seekonk": [41.8768, -71.3223],
  "north attleborough": [41.9784, -71.3134],
  "plainville": [42.0084, -71.3334],
  "wrentham": [42.0534, -71.3451],
  "uxbridge": [42.0751, -71.6334],
  "douglas": [42.0534, -71.7456],
  "sutton": [42.1401, -71.7595],
  "grafton": [42.2084, -71.6834],
  "northborough": [42.3187, -71.6445],
  "westborough": [42.2701, -71.6162],
  "shrewsbury": [42.2951, -71.7195],
  "worcester": [42.2626, -71.8023],
  "leicester": [42.2451, -71.9134],
  "auburn": [42.1951, -71.8373],
  "millbury": [42.1934, -71.7723],
  "northbridge": [42.1468, -71.6556],
  "whitinsville": [42.1168, -71.6684],
  "mendon": [42.1001, -71.5534],
  "hopedale": [42.1284, -71.5545],
  "upton": [42.1684, -71.6012],
  "medway": [42.1568, -71.3934],
  "cambridge": [42.3736, -71.1097],
  "watertown": [42.3668, -71.1823],
  "belmont": [42.3954, -71.1784],
  "lexington": [42.4473, -71.2245],
  "bedford": [42.4918, -71.2762],
  "burlington": [42.5054, -71.1956],
  "billerica": [42.5584, -71.2695],
  "chelmsford": [42.5993, -71.3645],
  "tewksbury": [42.6118, -71.2345],
  "wilmington": [42.5454, -71.1723],
  "woburn": [42.4793, -71.1523],
  "reading": [42.5254, -71.0995],
  "wakefield": [42.5054, -71.0723],
  "stoneham": [42.4784, -71.0995],
  "melrose": [42.4618, -71.0662],
  "malden": [42.4251, -71.0662],
  "medford": [42.4184, -71.0662],
  "winchester": [42.4518, -71.1362],
  "north reading": [42.5751, -71.0762],
  "andover": [42.6584, -71.1373],
  "north andover": [42.6984, -71.1323],
  "boxford": [42.6934, -71.0256],
  "topsfield": [42.6368, -70.9484],
  "middleton": [42.5984, -70.9212],
  "danvers": [42.5701, -70.9284],
  "wenham": [42.5984, -70.8884],
  "hamilton": [42.6218, -70.8684],
  "ipswich": [42.6784, -70.8412],
  "gloucester": [42.6159, -70.6620],
  "rockport": [42.6559, -70.6184],
  "essex": [42.6334, -70.7834],
  "manchester": [42.5784, -70.7684],
  "pride": [42.5401, -70.9834],
  "marblehead": [42.4984, -70.8584],
  "swampscott": [42.4718, -70.9162],
  "nahant": [42.4268, -70.9262],
  "winthrop": [42.3751, -70.9884],
};

function getCityCoords(city) {
  if (!city) return null;
  const key = city.toLowerCase().trim();
  return MA_CITY_COORDS[key] || null;
}

function groupSignaturesByCity(signatures) {
  const groups = {};
  for (const sig of signatures) {
    const city = sig.signer_city;
    const coords = getCityCoords(city);
    if (!coords) continue;
    const key = city.toLowerCase().trim();
    if (!groups[key]) {
      groups[key] = { city, coords, raw: 0, certified: 0 };
    }
    if (sig.verification_status === "certified") {
      groups[key].certified++;
    } else {
      groups[key].raw++;
    }
  }
  return Object.values(groups);
}

export default function SignatureMap({ signatures = [] }) {
  const [filter, setFilter] = useState("all");

  const groups = useMemo(() => groupSignaturesByCity(signatures), [signatures]);

  const mappedCount = useMemo(() =>
    signatures.filter(s => getCityCoords(s.signer_city)).length,
    [signatures]
  );

  const unmappedCount = signatures.length - mappedCount;

  if (signatures.length === 0) {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-6 text-center">
          <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No signatures collected yet to display on map</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            Signature Map — Massachusetts
          </CardTitle>
          <div className="flex items-center gap-1 text-xs">
            {["all", "raw", "certified"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4 px-4">
        <div className="rounded-lg overflow-hidden border" style={{ height: 340 }}>
          <MapContainer
            center={[42.1, -71.6]}
            zoom={8}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {groups.map((g) => {
              const showRaw = (filter === "all" || filter === "raw") && g.raw > 0;
              const showCert = (filter === "all" || filter === "certified") && g.certified > 0;
              return (
                <React.Fragment key={g.city}>
                  {showRaw && (
                    <CircleMarker
                      center={g.coords}
                      radius={Math.min(6 + g.raw * 1.2, 28)}
                      pathOptions={{ color: "#1e3a5f", fillColor: "#3b82f6", fillOpacity: 0.65, weight: 1.5 }}
                    >
                      <Tooltip>
                        <strong>{g.city}</strong><br />
                        Raw: {g.raw}{g.certified > 0 ? ` · Certified: ${g.certified}` : ""}
                      </Tooltip>
                    </CircleMarker>
                  )}
                  {showCert && (
                    <CircleMarker
                      center={[g.coords[0] + 0.01, g.coords[1] + 0.01]}
                      radius={Math.min(5 + g.certified * 1.5, 24)}
                      pathOptions={{ color: "#14532d", fillColor: "#22c55e", fillOpacity: 0.75, weight: 1.5 }}
                    >
                      <Tooltip>
                        <strong>{g.city}</strong><br />
                        Certified: {g.certified}{g.raw > 0 ? ` · Raw: ${g.raw}` : ""}
                      </Tooltip>
                    </CircleMarker>
                  )}
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            Raw collected
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            Certified
          </div>
          {unmappedCount > 0 && (
            <span className="ml-auto text-xs text-muted-foreground/60">{unmappedCount} sig{unmappedCount !== 1 ? "s" : ""} without mapped city</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}