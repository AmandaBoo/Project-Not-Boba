import React from 'react';

export const ModalComponent = ({children}) => {
    return (
        <div className={"modal"}>
            <div className={"modal-card"}>
                <div className={'modal-content'}>
                    {children}
                </div>
            </div>
        </div>
    );
}