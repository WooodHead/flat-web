import * as React from "react";
import "./ServiceWorkTest.less";
import * as zip_icon from "./assets/image/zip.svg";
import "@netless/zip";
import {netlessCaches} from "./NetlessCaches";

const contentTypesByExtension = {
    "css": "text/css",
    "js": "application/javascript",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "html": "text/html",
    "htm": "text/html"
};
const testUrl = "https://convertcdn.netless.link/dynamicConvert/769e4fd0f9a811ea8b9c074232aaccd4.zip";
export default class ServiceWorkTest extends React.Component<{}, {}> {

    public constructor(props: {}) {
        super(props);
    }

    private getZipReader = (data: any): Promise<any> => {
        return new Promise((fulfill, reject) => {
            zip.createReader(new zip.ArrayBufferReader(data), fulfill, reject);
        });
    }
    private startDownload = async (url): Promise<void> => {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const zipReader = await this.getZipReader(buffer);
        return await this.cacheContents(zipReader);
    }

    private cacheContents = (reader: any): Promise<void> => {
        return new Promise((fulfill, reject) => {
            reader.getEntries((entries) => {
                console.log('Installing', entries.length, 'files from zip');
                Promise.all(entries.map(this.cacheEntry)).then(fulfill as any, reject);
            });
        });
    }


    private cacheEntry = (entry: any): Promise<void> => {
        if (entry.directory) {
            return Promise.resolve();
        }
        return new Promise((fulfill, reject) => {
            entry.getData(new zip.BlobWriter(), (data) => {
                return netlessCaches.openCache("netless").then((cache) => {
                    const location = this.getLocation(entry.filename);
                    const response = new Response(data, {
                        headers: {
                            "Content-Type": this.getContentType(entry.filename)
                        }
                    });
                    if (entry.filename === "index.html") {
                        cache.put(this.getLocation(), response.clone());
                    }
                    return cache.put(location, response);
                }).then(fulfill, reject);
            });
        });
    }

    private getContentType = (filename: any): string => {
        const tokens = filename.split(".");
        const extension = tokens[tokens.length - 1];
        return contentTypesByExtension[extension] || "text/plain";
    }

    private deleteCache = async () => {
        const cache = await netlessCaches.openCache("netless");
        const result = await caches.delete("netless");
        console.log(`remove netless cache successfully: ${result}`);
    }

    /**
     * 计算 cache 占用空间，大小单位为 Byte，/1024 为 KiB 大小。
     */
    private calculateCache = async () => {
        const cache = await netlessCaches.openCache("netless");
        const keys = await cache.keys();
        let size = 0;
        for (const request of keys) {
            const response = await cache.match(request)!;
            if (response) {
                size += await (await response.blob()).size
            }
        }
        return size;
    }

    private getLocation = (filename?: string): string => {
        return "https://convertcdn.netless.link/dynamicConvert/" + filename;
    }

    public render(): React.ReactNode {
        return (
            <div className="service-box">
                <div onClick={() => this.startDownload(testUrl)} className="service-box-zip">
                    <img src={zip_icon} alt={"zip"}/>
                </div>
            </div>
        );
    }
}